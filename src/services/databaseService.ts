import { supabase } from '../lib/supabase';
import { UserProfile, FutureSelf } from '../types';

export const databaseService = {
  async saveManifestation(profile: UserProfile, futureSelf: FutureSelf) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('User not authenticated, skipping cloud save.');
      return;
    }

    // 1. Upsert profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        name: profile.name,
        passion: profile.passion,
        vibe: profile.vibe,
        future_vision: profile.futureVision,
        future_choice: profile.futureChoice,
        response_mode: profile.responseMode,
        selfie_url: profile.selfie,
        style: profile.style,
        avatar_type: profile.avatarType,
        gender: profile.gender,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (profileError) {
      console.error('Error saving profile:', profileError);
      throw profileError;
    }

    // 2. Upsert future self
    const { error: futureError } = await supabase
      .from('future_selves')
      .upsert({
        profile_id: profileData.id,
        narrative: futureSelf.narrative,
        traits: futureSelf.traits,
        visual_description: futureSelf.visualDescription,
        image_url: futureSelf.imageUrl,
        video_url: futureSelf.videoUrl,
        recap: futureSelf.recap,
        hotspots: futureSelf.hotspots,
        timeline_stages: futureSelf.timelineStages
      }, { onConflict: 'profile_id' });

    if (futureError) {
      console.error('Error saving future self:', futureError);
      throw futureError;
    }
  },

  async loadLatestManifestation() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        future_selves (*)
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) return null;

    const futureSelf = profile.future_selves?.[0];
    
    return {
      profile: {
        name: profile.name,
        passion: profile.passion,
        vibe: profile.vibe,
        futureVision: profile.future_vision,
        futureChoice: profile.future_choice,
        responseMode: profile.response_mode,
        selfie: profile.selfie_url,
        style: profile.style,
        avatarType: profile.avatar_type,
        gender: profile.gender
      } as UserProfile,
      futureSelf: futureSelf ? {
        narrative: futureSelf.narrative,
        traits: futureSelf.traits,
        visualDescription: futureSelf.visual_description,
        gender: profile.gender,
        imageUrl: futureSelf.image_url,
        videoUrl: futureSelf.video_url,
        recap: futureSelf.recap,
        hotspots: futureSelf.hotspots,
        timelineStages: futureSelf.timeline_stages
      } as FutureSelf : null
    };
  }
};
