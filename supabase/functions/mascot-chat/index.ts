import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userAge, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Age-appropriate system prompts
    const getSystemPrompt = (age: number) => {
      if (age <= 6) {
        return `Tu es une étoile magique ✨ qui aide les tout-petits musulmans (3-6 ans) à apprendre l'Islam. 
        Sois très simple, utilise des emojis, des mots faciles, et reste toujours positif et encourageant. 
        Parle de façon mignonne et affectueuse. Maximum 2 phrases courtes.
        Sujets : lettres arabes, courtes sourates, belles manières islamiques.`;
      }
      
      if (age <= 10) {
        return `Tu es une étoile guide ✨ pour les enfants musulmans (7-10 ans). 
        Tu peux les aider à réviser leurs leçons, les encourager, et répondre à des questions simples sur l'Islam.
        Reste bienveillant, utilise des emojis, et propose des actions concrètes.
        Sujets : sourates, invocations, prières, alphabet arabe, bonnes manières.`;
      }

      return `Tu es une étoile guide ✨ pour les jeunes musulmans (12+ ans). Tu peux :
      1. Les encourager dans leur apprentissage islamique
      2. Les aider à réviser sourates, invocations, nourania
      3. Répondre à des questions éducatives sur l'Islam
      4. Faire des recherches sur des sujets appropriés et éducatifs
      
      Sois bienveillant, informatif et adapte tes réponses à leur âge. 
      Pour les recherches, privilégie des sources fiables et éducatives.
      Évite les sujets controversés ou inadaptés aux mineurs.`;
    };

    // Determine if this needs web search (for 12+ users asking questions)
    const needsWebSearch = userAge >= 12 && (
      message.toLowerCase().includes('recherche') ||
      message.toLowerCase().includes('qu\'est-ce que') ||
      message.toLowerCase().includes('explique') ||
      message.toLowerCase().includes('comment') ||
      message.toLowerCase().includes('pourquoi') ||
      message.includes('?')
    );

    let systemPrompt = getSystemPrompt(userAge);
    
    if (needsWebSearch) {
      systemPrompt += `

      IMPORTANT : Cette question semble nécessiter une recherche. Utilise tes connaissances et fournis une réponse éducative appropriée pour un mineur musulman. Si tu n'es pas sûr d'une information, dis-le clairement.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Contexte de l'application : ${context}\n\nQuestion de l'élève : ${message}` }
        ],
        max_tokens: userAge <= 6 ? 100 : userAge <= 10 ? 200 : 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: '⏰ Je suis un peu fatiguée, peux-tu réessayer dans quelques minutes ?' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            response: '💫 J\'ai besoin de recharger mes étoiles ! Demande à ton professeur.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Mascot chat error:', error);
    
    // Age-appropriate error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let fallbackResponse = '😅 Désolée, je n\'ai pas bien compris. Peux-tu reformuler ?';
    
    return new Response(
      JSON.stringify({ response: fallbackResponse }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});