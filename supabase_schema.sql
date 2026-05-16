CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpar tabelas existentes (Cuidado: Isso apaga todos os dados!)
DROP TABLE IF EXISTS comunicados CASCADE;
DROP TABLE IF EXISTS ocorrencias CASCADE;
DROP TABLE IF EXISTS taxas CASCADE;
DROP TABLE IF EXISTS moradores CASCADE;
DROP TABLE IF EXISTS apartamentos CASCADE;

-- Tabela de Apartamentos
CREATE TABLE apartamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'vazio' CHECK (status IN ('ocupado', 'vazio')),
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

-- Inserindo dados iniciais (10 apartamentos: 1 a 10)
INSERT INTO apartamentos (numero, status) VALUES 
('1', 'vazio'), ('2', 'vazio'),
('3', 'vazio'), ('4', 'vazio'),
('5', 'vazio'), ('6', 'vazio'),
('7', 'vazio'), ('8', 'vazio'),
('9', 'vazio'), ('10', 'vazio');

-- Habilitando RLS (Row Level Security) - Como é admin único, pode ser simplificado ou configurado conforme auth
ALTER TABLE apartamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Acesso total para o usuário autenticado)
-- Políticas básicas (Acesso total para simplificar o desenvolvimento inicial)
CREATE POLICY "Allow all" ON apartamentos FOR ALL USING (true);
CREATE POLICY "Allow all" ON moradores FOR ALL USING (true);
CREATE POLICY "Allow all" ON taxas FOR ALL USING (true);
CREATE POLICY "Allow all" ON ocorrencias FOR ALL USING (true);
CREATE POLICY "Allow all" ON comunicados FOR ALL USING (true);
