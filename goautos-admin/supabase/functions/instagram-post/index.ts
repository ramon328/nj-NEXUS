
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { supabase } from "../_shared/supabase-client.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { postId, clientId } = await req.json()

    if (!postId || !clientId) {
      throw new Error('Post ID and Client ID are required')
    }

    // Get the Instagram integration for this client
    const { data: integration, error: integrationError } = await supabase
      .from('instagram_integrations')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle()

    if (integrationError || !integration) {
      throw new Error('Instagram integration not found')
    }

    // Fetch post details from Instagram Graph API with additional fields
    const response = await fetch(
      `https://graph.instagram.com/${postId}?fields=id,media_type,media_url,caption,permalink,thumbnail_url,timestamp,like_count,comments_count&access_token=${integration.access_token}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Instagram API error: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching Instagram post:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
