import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  X, 
  User, 
  Wallet, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Info,
  DollarSign,
  Copy
} from 'lucide-react';
import './ApartmentDetailsModal.css';
import { formatCurrency as formatMoney, parseCurrency } from '../utils/formatters';

const ApartmentDetailsModal = ({ isOpen, onClose, apartmentId, onUpdate }) => {
  const navigate = useNavigate();
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [copiedText, setCopiedText] = useState('');
  const [showVacateConfirm, setShowVacateConfirm] = useState(false);
  const [vacating, setVacating] = useState(false);
  
  const [isEditingApt, setIsEditingApt] = useState(false);
  const [savingApt, setSavingApt] = useState(false);
  const [allResidents, setAllResidents] = useState([]);
  const [aptFormData, setAptFormData] = useState({
    morador_id: '',
    valor_aluguel: 'R$ 0,00',
    qtd_pessoas: 1,
    data_entrada: '',
    data_saida: ''
  });

  useEffect(() => {
    if (isOpen && apartmentId) {
      fetchApartmentDetails();
    }
  }, [isOpen, apartmentId]);

  const fetchApartmentDetails = async () => {
    try {
      setLoading(true);
      // Fetch full apartment information, residents, fees, and occurrences
      const { data, error } = await supabase
        .from('apartamentos')
        .select(`
          *,
          moradores(*),
          taxas(*),
          ocorrencias(*)
        `)
        .eq('id', apartmentId)
        .single();

      if (error) throw error;
      setApartment(data);
      setActiveTab('geral');
    } catch (error) {
      console.error('Error fetching apartment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleVacate = async () => {
    if (!resident || !apartment) return;
    try {
      setVacating(true);
      
      // 1. Delete resident from moradores
      const { error: deleteError } = await supabase
        .from('moradores')
        .delete()
        .eq('id', resident.id);
        
      if (deleteError) throw deleteError;

      // 2. Reset apartment status to vazio
      const { error: updateError } = await supabase
        .from('apartamentos')
        .update({
          status: 'vazio',
          qtd_pessoas: null,
          data_entrada: null,
          data_saida: null
        })
        .eq('id', apartment.id);

      if (updateError) throw updateError;

      // 3. Trigger parent update if exists
      if (onUpdate) {
        onUpdate();
      }

      // 4. Refresh current view
      setShowVacateConfirm(false);
      await fetchApartmentDetails();
    } catch (err) {
      console.error('Error vacating apartment:', err);
      alert('Erro ao desocupar apartamento: ' + err.message);
    } finally {
      setVacating(false);
    }
  };

  const startEditing = async () => {
    try {
      // 1. Fetch all residents who are either unassigned or assigned to this apartment
      const { data: resData, error } = await supabase
        .from('moradores')
        .select('id, nome, apartamento_id')
        .order('nome', { ascending: true });
      
      if (!error) {
        const eligible = (resData || []).filter(r => 
          r.apartamento_id === null || r.apartamento_id === apartmentId
        );
        setAllResidents(eligible);
      }
    } catch (err) {
      console.error('Error fetching residents:', err);
    }

    // 2. Populate form state
    setAptFormData({
      morador_id: resident?.id || '',
      valor_aluguel: apartment?.valor_aluguel ? formatMoney((apartment.valor_aluguel * 100).toFixed(0)) : 'R$ 0,00',
      qtd_pessoas: apartment?.qtd_pessoas || 1,
      data_entrada: apartment?.data_entrada || new Date().toISOString().split('T')[0],
      data_saida: apartment?.data_saida || ''
    });

    setIsEditingApt(true);
  };

  const handleSaveApt = async (e) => {
    e.preventDefault();
    try {
      setSavingApt(true);

      const parsedRent = parseCurrency(aptFormData.valor_aluguel);
      const isNowOccupied = aptFormData.morador_id !== '';

      // 1. Update apartment specifications
      const { error: aptUpdateError } = await supabase
        .from('apartamentos')
        .update({
          status: isNowOccupied ? 'ocupado' : 'vazio',
          valor_aluguel: parsedRent,
          qtd_pessoas: isNowOccupied ? parseInt(aptFormData.qtd_pessoas) : null,
          data_entrada: isNowOccupied ? aptFormData.data_entrada : null,
          data_saida: isNowOccupied ? (aptFormData.data_saida || null) : null
        })
        .eq('id', apartmentId);

      if (aptUpdateError) throw aptUpdateError;

      // 2. Handle resident association update
      const previousResidentId = resident?.id || null;
      const newResidentId = aptFormData.morador_id || null;

      if (previousResidentId !== newResidentId) {
        // A. Unlink previous resident
        if (previousResidentId) {
          const { error: unlinkError } = await supabase
            .from('moradores')
            .update({ apartamento_id: null })
            .eq('id', previousResidentId);
          if (unlinkError) throw unlinkError;
        }

        // B. Link new resident
        if (newResidentId) {
          const { error: linkError } = await supabase
            .from('moradores')
            .update({ apartamento_id: apartmentId })
            .eq('id', newResidentId);
          if (linkError) throw linkError;
        }
      }

      // 3. Trigger parent refresh
      if (onUpdate) {
        onUpdate();
      }

      // 4. Reset editing state and refresh view
      setIsEditingApt(false);
      await fetchApartmentDetails();
    } catch (err) {
      console.error('Error saving apartment details:', err);
      alert('Erro ao salvar dados do apartamento: ' + err.message);
    } finally {
      setSavingApt(false);
    }
  };

  if (!isOpen) return null;

  const isOccupied = apartment?.status === 'ocupado';
  const resident = apartment?.moradores?.[0];

  // Helper to format currency
  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className={`details-modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="details-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Section */}
        <header className="details-modal-header">
          <div className="apto-title-block">
            <h2>Apto {apartment?.numero}</h2>
            <span className="apto-subtitle">Bloco A</span>
          </div>
          <div className="header-actions-right">
            <span className={`apto-status-badge ${isOccupied ? 'occupied' : 'vacant'}`}>
              {isOccupied ? 'Ocupado' : 'Vazio'}
            </span>
            <button className="close-modal-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="modal-loading-state">
            <div className="spinner"></div>
            <span>Carregando detalhes...</span>
          </div>
        ) : !apartment ? (
          <div className="modal-empty-state">Erro ao carregar dados do apartamento.</div>
        ) : (
          <>
            {/* Tab Navigation */}
            <nav className="modal-tab-nav">
              <button 
                className={`tab-link ${activeTab === 'geral' ? 'active' : ''}`}
                onClick={() => setActiveTab('geral')}
              >
                <Info size={16} />
                <span>Geral</span>
              </button>
              <button 
                className={`tab-link ${activeTab === 'financeiro' ? 'active' : ''}`}
                onClick={() => setActiveTab('financeiro')}
              >
                <Wallet size={16} />
                <span>Financeiro ({apartment.taxas?.length || 0})</span>
              </button>
              <button 
                className={`tab-link ${activeTab === 'ocorrencias' ? 'active' : ''}`}
                onClick={() => setActiveTab('ocorrencias')}
              >
                <AlertCircle size={16} />
                <span>Ocorrências ({apartment.ocorrencias?.length || 0})</span>
              </button>
            </nav>

            {/* Scrollable Content Body */}
            <div className="modal-content-body">
              {copiedText && (
                <div className="toast-notification">
                  {copiedText} copiado!
                </div>
              )}

              {/* TAB 1: GERAL & MORADOR */}
              {activeTab === 'geral' && (
                <div className="tab-pane">                  {isEditingApt ? (
                    <form onSubmit={handleSaveApt} className="apt-edit-form">
                      <div className="form-group-modal">
                        <label>Morador Responsável</label>
                        <select 
                          value={aptFormData.morador_id}
                          onChange={(e) => setAptFormData({ ...aptFormData, morador_id: e.target.value })}
                        >
                          <option value="">-- Sem morador (Vazio) --</option>
                          {allResidents.map(res => (
                            <option key={res.id} value={res.id}>
                              {res.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-grid-modal">
                        <div className="form-group-modal">
                          <label>Valor do Aluguel</label>
                          <input 
                            type="text"
                            value={aptFormData.valor_aluguel}
                            onChange={(e) => setAptFormData({ ...aptFormData, valor_aluguel: formatMoney(e.target.value) })}
                            required
                          />
                        </div>

                        <div className="form-group-modal">
                          <label>Capacidade (Pessoas)</label>
                          <input 
                            type="number"
                            min="1"
                            value={aptFormData.qtd_pessoas}
                            onChange={(e) => setAptFormData({ ...aptFormData, qtd_pessoas: e.target.value })}
                            required={aptFormData.morador_id !== ''}
                          />
                        </div>
                      </div>

                      <div className="form-grid-modal">
                        <div className="form-group-modal">
                          <label>Data de Entrada</label>
                          <input 
                            type="date"
                            value={aptFormData.data_entrada}
                            onChange={(e) => setAptFormData({ ...aptFormData, data_entrada: e.target.value })}
                            required={aptFormData.morador_id !== ''}
                          />
                        </div>

                        <div className="form-group-modal">
                          <label>Data de Saída (Opcional)</label>
                          <input 
                            type="date"
                            value={aptFormData.data_saida}
                            onChange={(e) => setAptFormData({ ...aptFormData, data_saida: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-actions-modal">
                        <button 
                          type="button" 
                          className="cancel-btn-modal" 
                          onClick={() => setIsEditingApt(false)}
                          disabled={savingApt}
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          className="save-btn-modal" 
                          disabled={savingApt}
                        >
                          {savingApt ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="tab-pane-header-modal">
                        <h3 className="section-subtitle-modal">Especificações</h3>
                        <button className="edit-apt-trigger-btn" onClick={startEditing}>
                          Editar Unidade
                        </button>
                      </div>

                      {/* General Specifications Grid */}
                      <div className="specs-grid">
                        <div className="spec-item">
                          <DollarSign size={18} className="spec-icon" />
                          <div>
                            <span className="spec-label">Aluguel</span>
                            <strong className="spec-value">{formatCurrency(apartment.valor_aluguel)}</strong>
                          </div>
                        </div>
                        <div className="spec-item">
                          <User size={18} className="spec-icon" />
                          <div>
                            <span className="spec-label">Capacidade</span>
                            <strong className="spec-value">{apartment.qtd_pessoas || 0} moradores</strong>
                          </div>
                        </div>
                        <div className="spec-item">
                          <Calendar size={18} className="spec-icon" />
                          <div>
                            <span className="spec-label">Data Entrada</span>
                            <strong className="spec-value">{formatDate(apartment.data_entrada)}</strong>
                          </div>
                        </div>
                        {apartment.data_saida && (
                          <div className="spec-item">
                            <Calendar size={18} className="spec-icon" />
                            <div>
                              <span className="spec-label">Data Saída</span>
                              <strong className="spec-value">{formatDate(apartment.data_saida)}</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resident Info Block */}
                      <div className="details-section">
                        <h3 className="section-subtitle-modal">Detalhes do Morador</h3>
                        {resident ? (
                          <div className="resident-info-card-wrapper">
                            <div className="resident-info-card">
                              <div className="resident-avatar">
                                <img src={resident.foto_url || `https://ui-avatars.com/api/?name=${resident.nome}&background=0D8ABC&color=fff`} alt={resident.nome} />
                              </div>
                              <div className="resident-details-rows">
                                <h4 className="resident-name-modal">{resident.nome}</h4>
                                
                                <div className="resident-detail-row">
                                  <Phone size={14} />
                                  <span>{resident.telefone || 'Não informado'}</span>
                                  {resident.telefone && (
                                    <button 
                                      className="copy-shortcut-btn"
                                      onClick={() => handleCopy(resident.telefone, 'Telefone')}
                                    >
                                      <Copy size={12} />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="resident-detail-row">
                                  <Mail size={14} />
                                  <span className="email-span">{resident.email || 'Não informado'}</span>
                                  {resident.email && (
                                    <button 
                                      className="copy-shortcut-btn"
                                      onClick={() => handleCopy(resident.email, 'E-mail')}
                                    >
                                      <Copy size={12} />
                                    </button>
                                  )}
                                </div>

                                {resident.cpf && (
                                  <div className="resident-detail-row text-secondary">
                                    <span>CPF: {resident.cpf}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {showVacateConfirm ? (
                              <div className="vacate-confirm-container">
                                <p className="vacate-confirm-text">
                                  Tem certeza que deseja remover o morador e desocupar este apartamento? Essa ação é permanente.
                                </p>
                                <div className="vacate-confirm-actions">
                                  <button 
                                    className="vacate-cancel-btn"
                                    onClick={() => setShowVacateConfirm(false)}
                                    disabled={vacating}
                                  >
                                    Cancelar
                                  </button>
                                  <button 
                                    className="vacate-confirm-btn"
                                    onClick={handleVacate}
                                    disabled={vacating}
                                  >
                                    {vacating ? 'Removendo...' : 'Sim, Desocupar'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="modal-resident-actions">
                                <button 
                                  className="action-link-btn edit-btn"
                                  onClick={() => {
                                    onClose();
                                    navigate(`/moradores/editar/${resident.id}`);
                                  }}
                                >
                                  Editar Cadastro
                                </button>
                                <button 
                                  className="action-link-btn vacate-btn"
                                  onClick={() => setShowVacateConfirm(true)}
                                >
                                  Desocupar Apto
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="vague-state-box">
                            <Info size={24} />
                            <p>Este apartamento está vazio ou não possui nenhum morador associado.</p>
                            <button 
                              className="add-resident-modal-btn"
                              onClick={startEditing}
                            >
                              Adicionar Morador
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: FINANCEIRO */}
              {activeTab === 'financeiro' && (
                <div className="tab-pane">
                  <h3 className="section-subtitle-modal">Histórico de Taxas</h3>
                  {apartment.taxas && apartment.taxas.length > 0 ? (
                    <div className="modal-list">
                      {apartment.taxas
                        .sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento))
                        .map((tax) => {
                          const isPaid = tax.status === 'pago';
                          return (
                            <div key={tax.id} className="modal-list-item">
                              <div className="list-item-main">
                                <span className="item-title">{tax.descricao}</span>
                                <span className="item-subtitle">Vencimento: {formatDate(tax.vencimento)}</span>
                              </div>
                              <div className="list-item-side">
                                <strong className="item-value">{formatCurrency(tax.valor)}</strong>
                                <span className={`modal-status-badge ${isPaid ? 'paid' : 'pending'}`}>
                                  {isPaid ? 'Pago' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="modal-empty-list">Nenhuma taxa cadastrada para esta unidade.</div>
                  )}
                </div>
              )}

              {/* TAB 3: OCORRÊNCIAS */}
              {activeTab === 'ocorrencias' && (
                <div className="tab-pane">
                  <h3 className="section-subtitle-modal">Registro de Ocorrências</h3>
                  {apartment.ocorrencias && apartment.ocorrencias.length > 0 ? (
                    <div className="modal-list">
                      {apartment.ocorrencias
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .map((oc) => {
                          const isResolved = oc.status === 'resolvida';
                          return (
                            <div key={oc.id} className="modal-list-item">
                              <div className="list-item-main">
                                <span className="item-title">{oc.descricao}</span>
                                <span className="item-subtitle">Registrado em: {formatDate(oc.created_at)}</span>
                              </div>
                              <div className="list-item-side">
                                <span className={`modal-status-badge ${isResolved ? 'paid' : 'pending'}`}>
                                  {isResolved ? 'Resolvida' : 'Aberta'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="modal-empty-list">Nenhuma ocorrência registrada para esta unidade.</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApartmentDetailsModal;
