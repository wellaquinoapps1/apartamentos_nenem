import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Wallet,
  Camera
} from 'lucide-react';
import { formatCPF, formatPhone, formatCurrency, parseCurrency } from '../utils/formatters';
import './ResidentForm.css';

const ResidentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [originalAptoId, setOriginalAptoId] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    apartamento_id: '',
    qtd_pessoas: 1,
    valor_aluguel: 'R$ 0,00',
    data_entrada: new Date().toISOString().split('T')[0],
    data_saida: '',
    foto_url: ''
  });

  useEffect(() => {
    const initForm = async () => {
      await fetchAvailableApartments();
      if (id) {
        await fetchResidentDetails(id);
      }
    };
    initForm();
  }, [id]);

  const fetchAvailableApartments = async () => {
    const { data, error } = await supabase
      .from('apartamentos')
      .select('id, numero, status, valor_aluguel');
    
    if (!error) {
      const sorted = (data || []).sort((a, b) => 
        a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' })
      );
      setApartments(sorted);
    }
  };

  const fetchResidentDetails = async (resId) => {
    try {
      setLoading(true);
      const { data: resident, error: resError } = await supabase
        .from('moradores')
        .select(`
          *,
          apartamentos(*)
        `)
        .eq('id', resId)
        .single();

      if (resError) throw resError;

      if (resident) {
        setOriginalAptoId(resident.apartamento_id);
        setFormData({
          nome: resident.nome || '',
          cpf: resident.cpf || '',
          telefone: resident.telefone || '',
          email: resident.email || '',
          apartamento_id: resident.apartamento_id || '',
          qtd_pessoas: resident.apartamentos?.qtd_pessoas || 1,
          valor_aluguel: formatCurrency(resident.apartamentos?.valor_aluguel?.toString() || '0'),
          data_entrada: resident.apartamentos?.data_entrada || new Date().toISOString().split('T')[0],
          data_saida: resident.apartamentos?.data_saida || '',
          foto_url: resident.foto_url || ''
        });
      }
    } catch (err) {
      console.error('Error fetching resident details:', err);
      alert('Erro ao carregar dados do morador.');
    } finally {
      setLoading(false);
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFormData(prev => ({ ...prev, foto_url: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save Resident
      const payload = {
        nome: formData.nome,
        cpf: formData.cpf,
        telefone: formData.telefone,
        email: formData.email,
        apartamento_id: formData.apartamento_id || null
      };

      if (formData.foto_url) {
        payload.foto_url = formData.foto_url;
      }

      let resError;
      if (id) {
        // Edit Mode: Update resident
        const { error } = await supabase
          .from('moradores')
          .update(payload)
          .eq('id', id);
        
        // Resilience Fallback for edit mode
        if (error && error.code === 'PGRST204') {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.foto_url;
          const { error: retryError } = await supabase
            .from('moradores')
            .update(fallbackPayload)
            .eq('id', id);
          resError = retryError;
        } else {
          resError = error;
        }
      } else {
        // Create Mode: Insert resident
        const { error } = await supabase
          .from('moradores')
          .insert([payload]);

        // Resilience Fallback for create mode
        if (error && error.code === 'PGRST204') {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.foto_url;
          const { error: retryError } = await supabase
            .from('moradores')
            .insert([fallbackPayload]);
          resError = retryError;
        } else {
          resError = error;
        }
      }

      if (resError) throw resError;

      // 2. Handle Apartment Status Transitions
      const aptoDetails = {
        status: 'ocupado',
        qtd_pessoas: parseInt(formData.qtd_pessoas),
        valor_aluguel: parseCurrency(formData.valor_aluguel),
        data_entrada: formData.data_entrada,
        data_saida: formData.data_saida || null
      };

      if (id) {
        // Edit Mode Apartment Changes
        if (formData.apartamento_id !== originalAptoId) {
          // A. If they moved out of their original apartment, vacate it
          if (originalAptoId) {
            const { error: vacateError } = await supabase
              .from('apartamentos')
              .update({
                status: 'vazio',
                qtd_pessoas: null,
                data_entrada: null,
                data_saida: null
              })
              .eq('id', originalAptoId);
            
            if (vacateError) throw vacateError;
          }

          // B. If they moved into a new apartment, occupy it
          if (formData.apartamento_id) {
            const { error: occupyError } = await supabase
              .from('apartamentos')
              .update(aptoDetails)
              .eq('id', formData.apartamento_id);
            
            if (occupyError) throw occupyError;
          }
        } else {
          // If the apartment didn't change, just update its specs
          if (formData.apartamento_id) {
            const { error: updateAptError } = await supabase
              .from('apartamentos')
              .update(aptoDetails)
              .eq('id', formData.apartamento_id);
            
            if (updateAptError) throw updateAptError;
          }
        }
      } else {
        // Create Mode: Occupy the selected apartment
        if (formData.apartamento_id) {
          const { error: aptoError } = await supabase
            .from('apartamentos')
            .update(aptoDetails)
            .eq('id', formData.apartamento_id);

          if (aptoError) throw aptoError;
        }
      }

      alert(id ? 'Morador atualizado com sucesso!' : 'Morador cadastrado com sucesso!');
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
        <h1>{id ? 'Editar Morador' : 'Novo Morador'}</h1>
      </header>

      <form className="resident-form" onSubmit={handleSubmit}>
        <div className="photo-upload-section">
          <div className="photo-preview-container" onClick={() => document.getElementById('photo-input').click()}>
            {formData.foto_url ? (
              <img src={formData.foto_url} alt="Morador" className="photo-preview" />
            ) : (
              <div className="photo-placeholder">
                <Camera size={32} />
                <span>Adicionar Foto</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            id="photo-input" 
            accept="image/*" 
            onChange={handlePhotoChange} 
            style={{ display: 'none' }} 
          />
        </div>
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
              {apartments.map(apto => {
                const isOccupied = apto.status === 'ocupado';
                const isCurrentApto = apto.id === originalAptoId;
                return (
                  <option 
                    key={apto.id} 
                    value={apto.id} 
                    disabled={isOccupied && !isCurrentApto}
                  >
                    Apto {apto.numero} {isOccupied ? (isCurrentApto ? '(Atual)' : '(Ocupado)') : '(Livre)'}
                  </option>
                );
              })}
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
