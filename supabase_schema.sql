CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpar tabelas existentes (Cuidado: Isso apaga todos os dados!)
DROP TABLE IF EXISTS comunicados CASCADE;
DROP TABLE IF EXISTS ocorrencias CASCADE;
DROP TABLE IF EXISTS taxas CASCADE;
DROP TABLE IF EXISTS moradores CASCADE;
DROP TABLE IF EXISTS apartamentos CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Tabela de Apartamentos
CREATE TABLE apartamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'vazio' CHECK (status IN ('ocupado', 'vazio')),
  qtd_pessoas INTEGER DEFAULT 0,
  valor_aluguel DECIMAL(10,2) DEFAULT 0,
  data_entrada DATE,
  data_saida DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Moradores
CREATE TABLE moradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  telefone TEXT,
  email TEXT,
  apartamento_id UUID REFERENCES apartamentos(id) ON DELETE SET NULL,
  foto_url TEXT, -- Coluna adicionada para armazenar a foto do perfil em Base64
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Taxas/Financeiro
CREATE TABLE taxas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartamento_id UUID REFERENCES apartamentos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Ocorrências
CREATE TABLE ocorrencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartamento_id UUID REFERENCES apartamentos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'resolvida')),
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Comunicados
CREATE TABLE comunicados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Administradores e Devs
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL DEFAULT '123456',
  role TEXT DEFAULT 'admin' CHECK (role IN ('dev', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir o desenvolvedor mestre
INSERT INTO admins (nome, email, senha, role) 
VALUES ('Developer', 'welldeveloper@dev.com', 'admin123', 'dev');

-- Inserindo dados iniciais (10 apartamentos: 1 a 10)
INSERT INTO apartamentos (numero, status, valor_aluguel) VALUES 
('1', 'vazio', 850.00), ('2', 'vazio', 850.00),
('3', 'vazio', 850.00), ('4', 'vazio', 900.00),
('5', 'vazio', 900.00), ('6', 'vazio', 900.00),
('7', 'vazio', 950.00), ('8', 'vazio', 950.00),
('9', 'vazio', 1000.00), ('10', 'vazio', 1000.00);

-- Habilitando RLS (Row Level Security) - Como é admin único, pode ser simplificado ou configurado conforme auth
ALTER TABLE apartamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Acesso total para simplificar o desenvolvimento inicial)
CREATE POLICY "Allow all" ON apartamentos FOR ALL USING (true);
CREATE POLICY "Allow all" ON moradores FOR ALL USING (true);
CREATE POLICY "Allow all" ON taxas FOR ALL USING (true);
CREATE POLICY "Allow all" ON ocorrencias FOR ALL USING (true);
CREATE POLICY "Allow all" ON comunicados FOR ALL USING (true);
CREATE POLICY "Allow all" ON admins FOR ALL USING (true);

-- ============================================================================
-- MIGRAÇÃO (RODAR APENAS ISSO CASO A TABELA MORADORES JÁ EXISTA):
-- Copie e cole no SQL Editor do Supabase para ativar as fotos!
-- 
-- ALTER TABLE moradores ADD COLUMN foto_url TEXT;
-- ============================================================================
