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
  Copy,
  History,
  Plus,
  Pencil,
  Trash2
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
  const [vacateDate, setVacateDate] = useState('');
  
  const [isEditingApt, setIsEditingApt] = useState(false);
  const [savingApt, setSavingApt] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyError, setHistoryError] = useState(false);
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [newHistForm, setNewHistForm] = useState({
    morador_nome: '',
    data_entrada: '',
    data_saida: ''
  });
  const [editingHistId, setEditingHistId] = useState(null);
  const [editHistForm, setEditHistForm] = useState({
    morador_nome: '',
    data_entrada: '',
    data_saida: ''
  });
  const [savingHist, setSavingHist] = useState(false);
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

      // Fetch history separately so it doesn't break if table isn't created yet
      try {
        const { data: hData, error: hError } = await supabase
          .from('historico_moradores')
          .select('*')
          .eq('apartamento_id', apartmentId)
          .order('data_entrada', { ascending: false });

        if (hError) {
          setHistoryError(true);
          setHistoryList([]);
        } else {
          setHistoryError(false);
          setHistoryList(hData || []);
        }
      } catch (err) {
        setHistoryError(true);
        setHistoryList([]);
      }
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
      
      // 1. Unlink resident from apartment (do NOT delete)
      const { error: unlinkError } = await supabase
        .from('moradores')
        .update({ apartamento_id: null })
        .eq('id', resident.id);
        
      if (unlinkError) throw unlinkError;

      // 2. Reset apartment status to vazio, set data_saida, and preserve data_entrada so the apartment shows when the last resident entered and left
      const { error: updateError } = await supabase
        .from('apartamentos')
        .update({
          status: 'vazio',
          qtd_pessoas: null,
          data_entrada: apartment.data_entrada,
          data_saida: vacateDate || new Date().toISOString().split('T')[0]
        })
        .eq('id', apartment.id);

      if (updateError) throw updateError;

      // 3. Atualizar ou inserir no historico_moradores
      try {
        const { data: openHist } = await supabase
          .from('historico_moradores')
          .select('id')
          .eq('apartamento_id', apartment.id)
          .eq('morador_id', resident.id)
          .is('data_saida', null)
          .order('data_entrada', { ascending: false })
          .limit(1);

        if (openHist && openHist.length > 0) {
          await supabase
            .from('historico_moradores')
            .update({ 
              data_entrada: apartment.data_entrada || new Date().toISOString().split('T')[0],
              data_saida: vacateDate || new Date().toISOString().split('T')[0] 
            })
            .eq('id', openHist[0].id);
        } else {
          await supabase
            .from('historico_moradores')
            .insert({
              apartamento_id: apartment.id,
              morador_id: resident.id,
              morador_nome: resident.nome,
              data_entrada: apartment.data_entrada || new Date().toISOString().split('T')[0],
              data_saida: vacateDate || new Date().toISOString().split('T')[0]
            });
        }
      } catch (err) {
        console.error('Erro ao atualizar historico_moradores:', err);
      }

      // 4. Trigger parent update if exists
      if (onUpdate) {
        onUpdate();
      }

      // 5. Refresh current view
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
          data_entrada: isNowOccupied ? aptFormData.data_entrada : apartment?.data_entrada,
          data_saida: isNowOccupied ? (aptFormData.data_saida || null) : (aptFormData.data_saida || new Date().toISOString().split('T')[0])
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

          // Fechar o histórico do morador anterior
          try {
            const { data: openHist } = await supabase
              .from('historico_moradores')
              .select('id')
              .eq('apartamento_id', apartmentId)
              .eq('morador_id', previousResidentId)
              .is('data_saida', null)
              .order('data_entrada', { ascending: false })
              .limit(1);

            if (openHist && openHist.length > 0) {
              await supabase
                .from('historico_moradores')
                .update({ 
                  data_entrada: apartment?.data_entrada || new Date().toISOString().split('T')[0],
                  data_saida: aptFormData.data_saida || new Date().toISOString().split('T')[0] 
                })
                .eq('id', openHist[0].id);
            } else {
              await supabase
                .from('historico_moradores')
                .insert({
                  apartamento_id: apartmentId,
                  morador_id: previousResidentId,
                  morador_nome: resident?.nome || 'Morador Anterior',
                  data_entrada: apartment?.data_entrada || new Date().toISOString().split('T')[0],
                  data_saida: aptFormData.data_saida || new Date().toISOString().split('T')[0]
                });
            }
          } catch (err) { console.error(err); }
        }

        // B. Link new resident
        if (newResidentId) {
          const { error: linkError } = await supabase
            .from('moradores')
            .update({ apartamento_id: apartmentId })
            .eq('id', newResidentId);
          if (linkError) throw linkError;

          // Criar novo registro de histórico para o novo morador
          try {
            const selectedRes = allResidents.find(r => r.id === newResidentId);
            await supabase
              .from('historico_moradores')
              .insert({
                apartamento_id: apartmentId,
                morador_id: newResidentId,
                morador_nome: selectedRes ? selectedRes.nome : 'Morador',
                data_entrada: aptFormData.data_entrada || new Date().toISOString().split('T')[0],
                data_saida: aptFormData.data_saida || null
              });
          } catch (err) { console.error(err); }
        }
      } else if (newResidentId) {
        // Se manteve o mesmo morador, atualizar a data de entrada/saída no histórico em aberto
        try {
          const { data: openHist } = await supabase
            .from('historico_moradores')
            .select('id')
            .eq('apartamento_id', apartmentId)
            .eq('morador_id', newResidentId)
            .order('data_entrada', { ascending: false })
            .limit(1);

          if (openHist && openHist.length > 0) {
            await supabase
              .from('historico_moradores')
              .update({
                data_entrada: aptFormData.data_entrada,
                data_saida: aptFormData.data_saida || null
              })
              .eq('id', openHist[0].id);
          }
        } catch (err) { console.error(err); }
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

  const handleAddHistory = async (e) => {
    e.preventDefault();
    try {
      setSavingHist(true);
      const { error } = await supabase
        .from('historico_moradores')
        .insert({
          apartamento_id: apartmentId,
          morador_nome: newHistForm.morador_nome,
          data_entrada: newHistForm.data_entrada,
          data_saida: newHistForm.data_saida || null
        });

      if (error) throw error;
      setShowAddHistory(false);
      setNewHistForm({ morador_nome: '', data_entrada: '', data_saida: '' });
      await fetchApartmentDetails();
    } catch (err) {
      console.error('Erro ao adicionar histórico:', err);
      alert('Erro ao adicionar histórico: ' + err.message);
    } finally {
      setSavingHist(false);
    }
  };

  const handleUpdateHistory = async (e) => {
    e.preventDefault();
    try {
      setSavingHist(true);
      const { error } = await supabase
        .from('historico_moradores')
        .update({
          morador_nome: editHistForm.morador_nome,
          data_entrada: editHistForm.data_entrada,
          data_saida: editHistForm.data_saida || null
        })
        .eq('id', editingHistId);

      if (error) throw error;
      setEditingHistId(null);
      await fetchApartmentDetails();
    } catch (err) {
      console.error('Erro ao atualizar histórico:', err);
      alert('Erro ao atualizar histórico: ' + err.message);
    } finally {
      setSavingHist(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro do histórico?')) return;
    try {
      setSavingHist(true);
      const { error } = await supabase
        .from('historico_moradores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchApartmentDetails();
    } catch (err) {
      console.error('Erro ao excluir histórico:', err);
      alert('Erro ao excluir histórico: ' + err.message);
    } finally {
      setSavingHist(false);
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
                className={`tab-link ${activeTab === 'historico' ? 'active' : ''}`}
                onClick={() => setActiveTab('historico')}
              >
                <History size={16} />
                <span>Histórico ({historyList.length})</span>
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
                                  O morador será desvinculado deste apartamento, mas seu cadastro será mantido no sistema.
                                </p>
                                <div className="form-group-modal" style={{ marginBottom: '12px' }}>
                                  <label style={{ color: '#991b1b' }}>Data de Saída</label>
                                  <input 
                                    type="date"
                                    value={vacateDate}
                                    onChange={(e) => setVacateDate(e.target.value)}
                                    style={{ borderColor: '#fca5a5', backgroundColor: '#ffffff' }}
                                    required
                                  />
                                </div>
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
                                    {vacating ? 'Desocupando...' : 'Confirmar Desocupação'}
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
                                  onClick={() => {
                                    setShowVacateConfirm(true);
                                    setVacateDate(apartment?.data_saida || new Date().toISOString().split('T')[0]);
                                  }}
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

              {/* TAB 4: HISTÓRICO DE OCUPAÇÃO */}
              {activeTab === 'historico' && (
                <div className="tab-pane">
                  <div className="tab-pane-header-modal">
                    <h3 className="section-subtitle-modal">Histórico de Moradores</h3>
                    <button 
                      className="edit-apt-trigger-btn"
                      onClick={() => setShowAddHistory(true)}
                    >
                      <Plus size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Adicionar Registro
                    </button>
                  </div>

                  {historyError && (
                    <div className="vague-state-box" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb', marginBottom: '16px' }}>
                      <AlertCircle size={24} style={{ color: '#d97706' }} />
                      <p style={{ color: '#b45309', fontWeight: '600' }}>
                        Tabela de histórico não encontrada. Para ativar esta funcionalidade, execute o script SQL de migração no painel do Supabase.
                      </p>
                    </div>
                  )}

                  {showAddHistory && (
                    <form onSubmit={handleAddHistory} className="apt-edit-form" style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a' }}>Novo Registro no Histórico</h4>
                      <div className="form-group-modal">
                        <label>Nome do Morador</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Carlos Silva"
                          value={newHistForm.morador_nome}
                          onChange={(e) => setNewHistForm({...newHistForm, morador_nome: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-grid-modal">
                        <div className="form-group-modal">
                          <label>Data de Entrada</label>
                          <input 
                            type="date" 
                            value={newHistForm.data_entrada}
                            onChange={(e) => setNewHistForm({...newHistForm, data_entrada: e.target.value})}
                            required
                          />
                        </div>
                        <div className="form-group-modal">
                          <label>Data de Saída</label>
                          <input 
                            type="date" 
                            value={newHistForm.data_saida}
                            onChange={(e) => setNewHistForm({...newHistForm, data_saida: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="form-actions-modal">
                        <button type="button" className="cancel-btn-modal" onClick={() => setShowAddHistory(false)} disabled={savingHist}>Cancelar</button>
                        <button type="submit" className="save-btn-modal" disabled={savingHist}>{savingHist ? 'Salvando...' : 'Adicionar'}</button>
                      </div>
                    </form>
                  )}

                  {historyList.length > 0 ? (
                    <div className="modal-list">
                      {historyList.map(hist => {
                        const isEditingThis = editingHistId === hist.id;

                        if (isEditingThis) {
                          return (
                            <form key={hist.id} onSubmit={handleUpdateHistory} className="apt-edit-form" style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #2563eb' }}>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#2563eb' }}>Editar Registro</h4>
                              <div className="form-group-modal">
                                <label>Nome do Morador</label>
                                <input 
                                  type="text" 
                                  value={editHistForm.morador_nome}
                                  onChange={(e) => setEditHistForm({...editHistForm, morador_nome: e.target.value})}
                                  required
                                />
                              </div>
                              <div className="form-grid-modal">
                                <div className="form-group-modal">
                                  <label>Data de Entrada</label>
                                  <input 
                                    type="date" 
                                    value={editHistForm.data_entrada}
                                    onChange={(e) => setEditHistForm({...editHistForm, data_entrada: e.target.value})}
                                    required
                                  />
                                </div>
                                <div className="form-group-modal">
                                  <label>Data de Saída</label>
                                  <input 
                                    type="date" 
                                    value={editHistForm.data_saida}
                                    onChange={(e) => setEditHistForm({...editHistForm, data_saida: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="form-actions-modal">
                                <button type="button" className="cancel-btn-modal" onClick={() => setEditingHistId(null)} disabled={savingHist}>Cancelar</button>
                                <button type="submit" className="save-btn-modal" disabled={savingHist}>{savingHist ? 'Salvando...' : 'Salvar Alterações'}</button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div key={hist.id} className="modal-list-item">
                            <div className="list-item-main">
                              <span className="item-title" style={{ fontSize: '0.95rem', fontWeight: '700' }}>{hist.morador_nome}</span>
                              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={12} /> Entrada: {formatDate(hist.data_entrada)}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={12} /> Saída: {hist.data_saida ? formatDate(hist.data_saida) : 'Atual'}
                                </span>
                              </div>
                            </div>
                            <div className="list-item-side" style={{ flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                              <button 
                                className="action-btn edit" 
                                title="Editar" 
                                style={{ background: '#eff6ff', border: 'none', padding: '6px', borderRadius: '6px', color: '#2563eb', cursor: 'pointer' }}
                                onClick={() => {
                                  setEditingHistId(hist.id);
                                  setEditHistForm({
                                    morador_nome: hist.morador_nome,
                                    data_entrada: hist.data_entrada,
                                    data_saida: hist.data_saida || ''
                                  });
                                }}
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                className="action-btn delete" 
                                title="Excluir" 
                                style={{ background: '#fff5f5', border: 'none', padding: '6px', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}
                                onClick={() => handleDeleteHistory(hist.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="modal-empty-list">Nenhum histórico registrado para esta unidade.</div>
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
