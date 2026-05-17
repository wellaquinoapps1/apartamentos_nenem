// Formatação de CPF: 000.000.000-00
export const formatCPF = (value) => {
  return value
    .replace(/\D/g, '') // Remove tudo que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1'); // Limita em 11 dígitos
};

// Formatação de Telefone: (00) 00000-0000
export const formatPhone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1'); // Limita em 11 dígitos
};

// Formatação de Moeda: R$ 0,00
export const formatCurrency = (value) => {
  let v = value.replace(/\D/g, '');
  v = (v / 100).toFixed(2) + '';
  v = v.replace(".", ",");
  v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
  v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
  return 'R$ ' + v;
};

// Função para converter o valor formatado de volta para número (decimal)
export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
};
