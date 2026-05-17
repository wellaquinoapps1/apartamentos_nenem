const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
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
    console.log("Taxas:", JSON.stringify(data, null, 2));
  }

  const { data: mData } = await supabase.from('moradores').select('nome, foto_url').eq('nome', 'Sarinhah');
  console.log("Morador Sarinhah foto:", mData[0]?.foto_url ? 'PRESENT (len: ' + mData[0].foto_url.length + ')' : 'NULL/EMPTY');
}

run();
