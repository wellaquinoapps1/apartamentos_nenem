import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  User, 
  CreditCard, 
  Phone, 
  Mail, 
  Building,
  Save,
  Loader2,
  Calendar,
  Wallet
} from 'lucide-react';
import { formatCPF, formatPhone, formatCurrency, parseCurrency } from '../utils/formatters';
import './ResidentForm.css';

const ResidentForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apartments, setApartments] = useState([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    apartamento_id: '',
    qtd_pessoas: 1,
    valor_aluguel: 'R$ 0,00',
    data_entrada: new Date().toISOString().split('T')[0],
    data_saida: ''
  });

  useEffect(() => {
    fetchAvailableApartments();
  }, []);

  const fetchAvailableApartments = async () => {
    const { data, error } = await supabase
      .from('apartamentos')
      .select('id, numero')
      .order('numero', { ascending: true });
    
    if (!error) {
      setApartments(data);
    }
  };

  const handleAptoChange = (aptoId) => {
    const selected = apartments.find(a => a.id === aptoId);
    setFormData({
      ...formData, 
      apartamento_id: aptoId,
      valor_aluguel: formatCurrency(selected?.valor_aluguel?.toString() || '0')
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert Resident
      const { error: resError } = await supabase
        .from('moradores')
        .insert([{
          nome: formData.nome,
          cpf: formData.cpf,
          telefone: formData.telefone,
          email: formData.email,
          apartamento_id: formData.apartamento_id
        }]);

      if (resError) throw resError;

      // 2. Update Apartment Status and Details
      if (formData.apartamento_id) {
        const { error: aptoError } = await supabase
          .from('apartamentos')
          .update({ 
            status: 'ocupado',
            qtd_pessoas: parseInt(formData.qtd_pessoas),
            valor_aluguel: parseCurrency(formData.valor_aluguel),
            data_entrada: formData.data_entrada,
            data_saida: formData.data_saida || null
          })
          .eq('id', formData.apartamento_id);

        if (aptoError) throw aptoError;
      }

      alert('Morador cadastrado com sucesso!');
      navigate('/moradores');
    } catch (error) {
      console.error('Error saving resident:', error);
      alert('Erro ao salvar morador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resident-form-page">
      <header className="form-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1>Novo Morador</h1>
      </header>

      <form className="resident-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <label>Nome Completo</label>
          <div className="input-wrapper">
            <User className="input-icon" size={20} />
            <input 
              type="text" 
              placeholder="Ex: João Silva" 
              required
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-section">
            <label>CPF</label>
            <div className="input-wrapper">
              <CreditCard className="input-icon" size={20} />
              <input 
                type="text" 
                placeholder="000.000.000-00" 
                value={formData.cpf}
                maxLength={14}
                onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
              />
            </div>
          </div>

          <div className="form-section">
            <label>Telefone</label>
            <div className="input-wrapper">
              <Phone className="input-icon" size={20} />
              <input 
                type="text" 
                placeholder="(00) 00000-0000" 
                value={formData.telefone}
                maxLength={15}
                onChange={(e) => setFormData({...formData, telefone: formatPhone(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <label>E-mail</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={20} />
            <input 
              type="email" 
              placeholder="joao@email.com" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>

        <div className="form-section">
          <label>Apartamento</label>
          <div className="input-wrapper">
            <Building className="input-icon" size={20} />
            <select 
              required
              value={formData.apartamento_id}
              onChange={(e) => handleAptoChange(e.target.value)}
            >
              <option value="">Selecione uma unidade</option>
              {apartments.map(apto => (
                <option key={apto.id} value={apto.id}>Apto {apto.numero}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-section">
            <label>Qtd. de Pessoas</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input 
                type="number" 
                min="1"
                value={formData.qtd_pessoas}
                onChange={(e) => setFormData({...formData, qtd_pessoas: e.target.value})}
              />
            </div>
          </div>

          <div className="form-section">
            <label>Valor do Aluguel</label>
            <div className="input-wrapper">
              <Wallet className="input-icon" size={20} />
              <input 
                type="text" 
                value={formData.valor_aluguel}
                onChange={(e) => setFormData({...formData, valor_aluguel: formatCurrency(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-section">
            <label>Data de Entrada</label>
            <div className="input-wrapper">
              <Calendar className="input-icon" size={20} />
              <input 
                type="date" 
                value={formData.data_entrada}
                onChange={(e) => setFormData({...formData, data_entrada: e.target.value})}
              />
            </div>
          </div>

          <div className="form-section">
            <label>Data de Saída (Opcional)</label>
            <div className="input-wrapper">
              <Calendar className="input-icon" size={20} />
              <input 
                type="date" 
                value={formData.data_saida}
                onChange={(e) => setFormData({...formData, data_saida: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={20} /> : <Save size={20} />}
            <span>Salvar Cadastro</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResidentForm;
