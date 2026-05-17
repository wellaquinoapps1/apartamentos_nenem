import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('taxas')
    .select('*, apartamentos(numero, moradores(nome, foto_url))')
    .order('created_at', { ascending: false })
    .limit(2);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
