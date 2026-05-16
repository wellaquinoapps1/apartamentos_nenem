Crie uma aplicação web administrativa para gestão de um condomínio residencial.

Apenas um usuário utiliza o sistema (o dono/síndico).
Não existem outros perfis de acesso.

A aplicação deve ser pensada para funcionar com backend no Supabase (PostgreSQL), portanto todas as telas, formulários e listagens devem refletir estruturas reais de banco de dados.

O sistema é um painel administrativo simples para controlar:

Apartamentos
Moradores
Taxas/boletos
Ocorrências
Comunicados
🧱 Estrutura de dados esperada (modelar a UI baseada nisso)
Tabela: apartamentos
id
numero
status (ocupado | vazio)
Tabela: moradores
id
nome
cpf
telefone
email
apartamento_id (relação)
Tabela: taxas
id
apartamento_id (relação)
descricao
valor
vencimento
status (pendente | pago)
Tabela: ocorrencias
id
apartamento_id (relação)
descricao
status (aberta | resolvida)
data
Tabela: comunicados
id
titulo
mensagem
data
🧩 Telas da aplicação
Dashboard

Cards com:

Total de apartamentos
Total de moradores
Taxas pendentes
Ocorrências abertas
Apartamentos

Tabela listando apartamentos com:

Número
Status
Morador atual
Situação financeira
Botão de detalhes
Moradores

Tela de cadastro e listagem vinculada ao apartamento.

Taxas / Financeiro

Listagem por apartamento com status de pagamento e histórico.

Ocorrências

Registro e acompanhamento por apartamento.

Comunicados

Criar e listar comunicados.

🎨 Interface
Estilo dashboard SaaS moderno
Menu lateral fixo
Cards informativos
Tabelas administrativas
Formulários claros e objetivos
Layout limpo, profissional e responsivo
📌 Importante

A aplicação deve parecer pronta para uso real, já pensada para integrar diretamente com as tabelas do Supabase, com relações claras entre os dados.

SIGA os modelos de telas que irei enviar. Se achar que algo está errado ou que pode ser melhorado, me avise.