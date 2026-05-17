import React, { useState, useEffect } from 'react';
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

const ApartmentDetailsModal = ({ isOpen, onClose, apartmentId }) => {
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [copiedText, setCopiedText] = useState('');

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
                <div className="tab-pane">
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
                    ) : (
                      <div className="vague-state-box">
                        <Info size={24} />
                        <p>Este apartamento está vazio ou não possui nenhum morador associado.</p>
                      </div>
                    )}
                  </div>
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
