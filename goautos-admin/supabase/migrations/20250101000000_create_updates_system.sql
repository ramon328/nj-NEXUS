-- =====================================================
-- UPDATES SYSTEM - Novedades, Tutoriales y Changelog
-- =====================================================

-- 1. Create updates table
CREATE TABLE IF NOT EXISTS updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    type TEXT NOT NULL CHECK (type IN ('tutorial', 'feature', 'changelog')),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT NOT NULL,

    -- Content
    content JSONB, -- Rich text content in JSON format (Tiptap/Slate compatible)
    content_markdown TEXT, -- Markdown fallback

    -- Media
    image_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    category TEXT, -- 'feature', 'guide', 'announcement', etc.
    read_time TEXT, -- e.g., "5 min"

    -- Status and visibility
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT FALSE,
    is_major BOOLEAN DEFAULT FALSE, -- For changelog entries to mark major versions

    -- Versioning (for changelog)
    version TEXT, -- e.g., "v2.5.0"

    -- Author and client
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE, -- NULL for global updates (superadmin)

    -- Styling
    gradient TEXT, -- CSS gradient classes

    -- Timestamps
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_updates_type ON updates(type);
CREATE INDEX IF NOT EXISTS idx_updates_status ON updates(status);
CREATE INDEX IF NOT EXISTS idx_updates_client_id ON updates(client_id);
CREATE INDEX IF NOT EXISTS idx_updates_published_at ON updates(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_updates_featured ON updates(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_updates_slug ON updates(slug);
CREATE INDEX IF NOT EXISTS idx_updates_tags ON updates USING GIN(tags);

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_updates_updated_at ON updates;
CREATE TRIGGER update_updates_updated_at
    BEFORE UPDATE ON updates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Create function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    slug := lower(trim(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g')));
    slug := regexp_replace(slug, '\s+', '-', 'g');
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION set_slug_from_title()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug(NEW.title);

        -- Ensure uniqueness by appending a number if needed
        WHILE EXISTS (SELECT 1 FROM updates WHERE slug = NEW.slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
            NEW.slug := NEW.slug || '-' || floor(random() * 1000)::TEXT;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updates_slug ON updates;
CREATE TRIGGER set_updates_slug
    BEFORE INSERT OR UPDATE ON updates
    FOR EACH ROW
    EXECUTE FUNCTION set_slug_from_title();

-- 7. Enable Row Level Security
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Allow anyone to read published updates (for public access)
DROP POLICY IF EXISTS "Anyone can view published updates" ON updates;
CREATE POLICY "Anyone can view published updates"
    ON updates FOR SELECT
    USING (status = 'published');

-- Superadmins can do everything
DROP POLICY IF EXISTS "Superadmins can do everything with updates" ON updates;
CREATE POLICY "Superadmins can do everything with updates"
    ON updates FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'superadmin'
    );

-- Admins can manage updates for their client
DROP POLICY IF EXISTS "Admins can manage their client's updates" ON updates;
CREATE POLICY "Admins can manage their client's updates"
    ON updates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.rol = 'admin'
            AND users.client_id = updates.client_id
        )
    );

-- Authors can manage their own updates
DROP POLICY IF EXISTS "Authors can manage their own updates" ON updates;
CREATE POLICY "Authors can manage their own updates"
    ON updates FOR ALL
    USING (author_id = auth.uid());

-- 9. Create helpful views

-- View for published updates with author info
CREATE OR REPLACE VIEW published_updates_with_author AS
SELECT
    u.*,
    CONCAT(us.first_name, ' ', us.last_name) as author_name,
    us.rol as author_role,
    c.name as client_name
FROM updates u
LEFT JOIN users us ON u.author_id = us.auth_id
LEFT JOIN clients c ON u.client_id = c.id
WHERE u.status = 'published'
ORDER BY u.published_at DESC NULLS LAST, u.created_at DESC;

-- 10. Grant permissions
GRANT SELECT ON published_updates_with_author TO authenticated, anon;
GRANT ALL ON updates TO authenticated;

-- 11. Create sample global updates (for superadmin demo)
-- This will be populated by the superadmin via the UI
