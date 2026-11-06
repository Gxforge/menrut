import {createClient} from '@supabase/supabase-js';
import {tokenProvider} from './api';
export const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'},
});
tokenProvider(async()=>{const {data}=await supabase.auth.getSession();return data.session?.access_token??null;});
