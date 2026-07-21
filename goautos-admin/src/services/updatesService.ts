import { supabase } from '@/integrations/supabase/client';
import { uploadImage } from '@/utils/fileUploadUtils';

// ============================================
// TYPES
// ============================================

export type UpdateType = 'tutorial' | 'feature' | 'changelog';
export type UpdateStatus = 'draft' | 'published' | 'archived';
export type UpdateCategory = 'feature' | 'guide' | 'announcement';

export interface Update {
  id: string;
  type: UpdateType;
  title: string;
  slug: string;
  excerpt: string;
  content?: any; // Rich text JSON
  content_markdown?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  tags?: string[];
  category?: UpdateCategory;
  read_time?: string;
  status: UpdateStatus;
  featured?: boolean;
  is_major?: boolean;
  version?: string;
  author_id?: string;
  client_id?: number | null;
  gradient?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateWithAuthor extends Update {
  author_name?: string;
  author_role?: string;
  client_name?: string;
}

export interface CreateUpdateInput {
  type: UpdateType;
  title: string;
  slug?: string;
  excerpt: string;
  content?: any;
  content_markdown?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  tags?: string[];
  category?: UpdateCategory;
  read_time?: string;
  status?: UpdateStatus;
  featured?: boolean;
  is_major?: boolean;
  version?: string;
  gradient?: string;
  client_id?: number | null;
}

export interface UpdateFilters {
  type?: UpdateType;
  status?: UpdateStatus;
  category?: UpdateCategory;
  featured?: boolean;
  client_id?: number | null;
  tags?: string[];
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Get all updates with optional filters
 */
export const getUpdates = async (filters?: UpdateFilters): Promise<UpdateWithAuthor[]> => {
  try {
    let query = (supabase as any)
      .from('published_updates_with_author')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }
      if (filters.client_id !== undefined) {
        if (filters.client_id === null) {
          query = query.is('client_id', null); // Global updates
        } else {
          query = query.eq('client_id', filters.client_id);
        }
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching updates:', error);
      throw error;
    }

    return data as UpdateWithAuthor[];
  } catch (error) {
    console.error('Error in getUpdates:', error);
    return [];
  }
};

/**
 * Get a single update by ID
 */
export const getUpdateById = async (id: string): Promise<UpdateWithAuthor | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('published_updates_with_author')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching update by ID:', error);
      throw error;
    }

    return data as UpdateWithAuthor;
  } catch (error) {
    console.error('Error in getUpdateById:', error);
    return null;
  }
};

/**
 * Get a single update by slug
 */
export const getUpdateBySlug = async (slug: string): Promise<UpdateWithAuthor | null> => {
  try {
    const { data, error} = await (supabase as any)
      .from('published_updates_with_author')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching update by slug:', error);
      throw error;
    }

    return data as UpdateWithAuthor;
  } catch (error) {
    console.error('Error in getUpdateBySlug:', error);
    return null;
  }
};

/**
 * Create a new update
 */
export const createUpdate = async (input: CreateUpdateInput): Promise<Update | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();

    const insertData: any = {
      ...input,
      author_id: userData.user?.id,
      status: input.status || 'draft',
    };

    // If publishing immediately, set published_at
    if (insertData.status === 'published' && !insertData.published_at) {
      insertData.published_at = new Date().toISOString();
    }

    const { data, error } = await (supabase as any)
      .from('updates')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating update:', error);
      throw error;
    }

    return data as Update;
  } catch (error) {
    console.error('Error in createUpdate:', error);
    return null;
  }
};

/**
 * Update an existing update
 */
export const updateUpdate = async (id: string, input: Partial<CreateUpdateInput>): Promise<Update | null> => {
  try {
    const updateData: any = { ...input };

    // If changing from draft to published, set published_at
    if (input.status === 'published') {
      const { data: existing } = await (supabase as any)
        .from('updates')
        .select('status, published_at')
        .eq('id', id)
        .single();

      if (existing?.status !== 'published' && !updateData.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await (supabase as any)
      .from('updates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating update:', error);
      throw error;
    }

    return data as Update;
  } catch (error) {
    console.error('Error in updateUpdate:', error);
    return null;
  }
};

/**
 * Delete an update
 */
export const deleteUpdate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('updates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting update:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteUpdate:', error);
    return false;
  }
};

/**
 * Publish an update (change status from draft to published)
 */
export const publishUpdate = async (id: string): Promise<Update | null> => {
  return updateUpdate(id, {
    status: 'published',
  });
};

/**
 * Unpublish an update (change status from published to draft)
 */
export const unpublishUpdate = async (id: string): Promise<Update | null> => {
  return updateUpdate(id, {
    status: 'draft',
  });
};

/**
 * Archive an update
 */
export const archiveUpdate = async (id: string): Promise<Update | null> => {
  return updateUpdate(id, {
    status: 'archived',
  });
};

/**
 * Upload image for an update
 */
export const uploadUpdateImage = async (file: File, folder: string = 'updates'): Promise<string | null> => {
  try {
    const imageUrl = await uploadImage(file, folder);
    return imageUrl;
  } catch (error) {
    console.error('Error uploading update image:', error);
    return null;
  }
};

/**
 * Get featured update (for hero section)
 */
export const getFeaturedUpdate = async (): Promise<UpdateWithAuthor | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('published_updates_with_author')
      .select('*')
      .eq('featured', true)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching featured update:', error);
      throw error;
    }

    return data as UpdateWithAuthor || null;
  } catch (error) {
    console.error('Error in getFeaturedUpdate:', error);
    return null;
  }
};

/**
 * Get all available tags from updates
 */
export const getAllTags = async (): Promise<string[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('updates')
      .select('tags')
      .not('tags', 'is', null);

    if (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }

    // Flatten and deduplicate tags
    const allTags = new Set<string>();
    data?.forEach((update: any) => {
      if (update.tags && Array.isArray(update.tags)) {
        update.tags.forEach((tag: string) => allTags.add(tag));
      }
    });

    return Array.from(allTags).sort();
  } catch (error) {
    console.error('Error in getAllTags:', error);
    return [];
  }
};

/**
 * Get changelog entries
 */
export const getChangelogEntries = async (limit?: number): Promise<UpdateWithAuthor[]> => {
  try {
    let query = supabase
      .from('published_updates_with_author')
      .select('*')
      .eq('type', 'changelog')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching changelog entries:', error);
      throw error;
    }

    return data as UpdateWithAuthor[];
  } catch (error) {
    console.error('Error in getChangelogEntries:', error);
    return [];
  }
};

// ============================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================

/**
 * Get all admin users emails for notification
 */
export const getAdminEmails = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .in('rol', ['admin', 'administrador'])
      .not('email', 'is', null);

    if (error) {
      console.error('Error fetching admin emails:', error);
      throw error;
    }

    return data?.map((u) => u.email).filter(Boolean) || [];
  } catch (error) {
    console.error('Error in getAdminEmails:', error);
    return [];
  }
};

/**
 * Generate HTML email template for update notification
 */
export const generateUpdateEmailHtml = (update: UpdateWithAuthor): string => {
  const typeLabel = update.type === 'tutorial' ? 'Tutorial' : 'Novedad';
  const categoryColor = update.type === 'tutorial' ? '#3b82f6' : '#0ea5e9';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${update.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                🚀 Nueva ${typeLabel} en GoAuto
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Badge -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${categoryColor}15; color: ${categoryColor}; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                  ${typeLabel}
                </span>
              </div>

              <!-- Title -->
              <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 28px; font-weight: 700; line-height: 1.3;">
                ${update.title}
              </h2>

              <!-- Excerpt -->
              <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                ${update.excerpt}
              </p>

              <!-- Image if available -->
              ${update.image_url ? `
              <div style="margin-bottom: 24px; border-radius: 12px; overflow: hidden;">
                <img src="${update.image_url}" alt="${update.title}" style="width: 100%; height: auto; display: block;">
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://portal.goauto.cl/novedades/${update.slug}"
                   style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Ver ${typeLabel} Completa →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 14px;">
                Este correo fue enviado desde GoAuto Admin
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 12px;">
                © ${new Date().getFullYear()} GoAuto. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Send update notification email to specific recipients
 */
export const sendUpdateNotificationEmail = async (
  update: UpdateWithAuthor,
  recipients: string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (recipients.length === 0) {
      return { success: false, error: 'No hay destinatarios' };
    }

    const typeLabel = update.type === 'tutorial' ? 'Tutorial' : 'Novedad';
    const emailHtml = generateUpdateEmailHtml(update);

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipients,
        subject: `Nueva ${typeLabel} en GoAuto: ${update.title}`,
        content: emailHtml,
        from: 'GoAuto <reportes@goauto.cl>',
      },
    });

    if (error) {
      console.error('Error sending notification email:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.error('Edge function returned error:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendUpdateNotificationEmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Send test email for update notification
 */
export const sendTestUpdateEmail = async (
  update: UpdateWithAuthor,
  testEmail: string
): Promise<{ success: boolean; error?: string }> => {
  return sendUpdateNotificationEmail(update, [testEmail]);
};

/**
 * Send update notification to all admins
 */
export const sendUpdateNotificationToAllAdmins = async (
  update: UpdateWithAuthor
): Promise<{ success: boolean; sentCount: number; error?: string }> => {
  try {
    const adminEmails = await getAdminEmails();

    if (adminEmails.length === 0) {
      return { success: false, sentCount: 0, error: 'No hay administradores registrados' };
    }

    const result = await sendUpdateNotificationEmail(update, adminEmails);

    if (result.success) {
      return { success: true, sentCount: adminEmails.length };
    }

    return { success: false, sentCount: 0, error: result.error };
  } catch (error) {
    console.error('Error in sendUpdateNotificationToAllAdmins:', error);
    return {
      success: false,
      sentCount: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};
