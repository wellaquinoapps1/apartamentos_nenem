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
  Loader2
} from 'lucide-react';
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
    apartamento_id: ''
  });

  useEffect(() => {
    fetchAvailableApartments();
  }, []);

  const fetchAvailableApartments = async () => {
    const { data, error } = await supabase
      .from('apartamentos')
      .select('id, numero')
      .order('numero', { ascending: true });
    
    if (!error) setApartments(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert Resident
      const { error: resError } = await supabase
        .from('moradores')
        .insert([formData]);

      if (resError) throw resError;

      // 2. Update Apartment Status if one was selected
      if (formData.apartamento_id) {
        await supabase
          .from('apartamentos')
          .update({ status: 'ocupado' })
          .eq('id', formData.apartamento_id);
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
                onChange={(e) => setFormData({...formData, cpf: e.target.value})}
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
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
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
              onChange={(e) => setFormData({...formData, apartamento_id: e.target.value})}
            >
              <option value="">Selecione uma unidade</option>
              {apartments.map(apto => (
                <option key={apto.id} value={apto.id}>Apto {apto.numero}</option>
              ))}
            </select>
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
