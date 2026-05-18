import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Wallet, 
  AlertTriangle, 
  Search,
  Building2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  DollarSign,
  Calendar,
  Sparkles,
  Building,
  AlertCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import { formatCurrency, parseCurrency } from '../utils/formatters';
import './Finance.css';

const Finance = () => {
  const [activeSection, setActiveSection] = useState('receitas'); // 'receitas' or 'despesas'
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7)); // e.g. '2026-05'

  // Lists
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [apartments, setApartments] = useState([]);

  // Computed Period Data & Stats
  const periodRevenues = useMemo(() => {
    if (!period) return revenues;
    return revenues.filter(r => r.vencimento && r.vencimento.startsWith(period));
  }, [revenues, period]);

  const periodExpenses = useMemo(() => {
    if (!period) return expenses;
    return expenses.filter(e => e.vencimento && e.vencimento.startsWith(period));
  }, [expenses, period]);

  const stats = useMemo(() => {
    const totalRevenues = periodRevenues
      .filter(t => t.status === 'pago')
      .reduce((sum, current) => sum + current.amount, 0);

    const totalExpenses = periodExpenses
      .filter(d => d.status === 'pago')
      .reduce((sum, current) => sum + current.amount, 0);

    const netBalance = totalRevenues - totalExpenses;

    const totalBilled = periodRevenues.length;
    const totalDelinquent = periodRevenues.filter(t => t.status === 'pendente').length;
    const delinquencyRate = totalBilled > 0 ? (totalDelinquent / totalBilled) * 100 : 0;

    const occupiedApts = apartments.filter(a => a.status === 'ocupado').length;
    const totalApts = apartments.length;

    return { totalRevenues, totalExpenses, netBalance, delinquencyRate, occupiedApts, totalApts };
  }, [periodRevenues, periodExpenses, apartments]);

  // Modal States
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [confirmPaymentModal, setConfirmPaymentModal] = useState({ isOpen: false, item: null, type: '' });
  const [toast, setToast] = useState(null);

  // Edit / Delete States
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, item: null, type: '' });

  // Form States
  const [revenueForm, setRevenueForm] = useState({
    apartamento_id: '',
    descricao: '',
    valor: '',
    vencimento: '',
    status: 'pendente'
  });

  const [expenseForm, setExpenseForm] = useState({
    descricao: '',
    valor: '',
    vencimento: '',
    status: 'pendente',
    categoria: 'Outros'
  });

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setRevenueForm({ apartamento_id: '', descricao: '', valor: '', vencimento: '', status: 'pendente' });
    setExpenseForm({ descricao: '', valor: '', vencimento: '', status: 'pendente', categoria: 'Outros' });
    if (activeSection === 'receitas') {
      setShowRevenueModal(true);
    } else {
      setShowExpenseModal(true);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    if (activeSection === 'receitas') {
      setRevenueForm({
        apartamento_id: item.apartamento_id || '',
        descricao: item.description || '',
        valor: formatCurrency(((item.amount || 0) * 100).toFixed(0)),
        vencimento: item.vencimento ? item.vencimento.substring(0, 10) : '',
        status: item.status || 'pendente'
      });
      setShowRevenueModal(true);
    } else {
      setExpenseForm({
        descricao: item.description || '',
        valor: formatCurrency(((item.amount || 0) * 100).toFixed(0)),
        vencimento: item.vencimento ? item.vencimento.substring(0, 10) : '',
        status: item.status || 'pendente',
        categoria: item.categoria || 'Outros'
      });
      setShowExpenseModal(true);
    }
  };

  const handleDeleteTransaction = async () => {
    const { item, type } = deleteConfirmModal;
    if (!item) return;

    try {
      setLoading(true);
      if (type === 'receita') {
        const { error } = await supabase
          .from('taxas')
          .delete()
          .eq('id', item.id);
        if (error) throw error;
        showToast('Receita excluída com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('despesas')
          .delete()
          .eq('id', item.id);
        if (error) throw error;
        showToast('Despesa excluída com sucesso!', 'success');
      }
      setDeleteConfirmModal({ isOpen: false, item: null, type: '' });
      await fetchFinanceData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Occupied Apartments with their residents
      const { data: aptos, error: aptosError } = await supabase
        .from('apartamentos')
        .select('*, moradores(nome)')
        .order('numero', { ascending: true });
      if (aptosError) throw aptosError;
      setApartments(aptos || []);

      const totalApts = aptos?.length || 0;
      const occupiedApts = aptos?.filter(a => a.status === 'ocupado').length || 0;

      // 2. Fetch Revenues (taxas) with resident names
      const { data: taxasData, error: taxasError } = await supabase
        .from('taxas')
        .select('*, apartamentos(numero, moradores(nome))')
        .order('vencimento', { ascending: false });
      if (taxasError) throw taxasError;

      const formattedRevenues = (taxasData || []).map(t => {
        const moradorNome = t.apartamentos?.moradores?.[0]?.nome;
        return {
          id: t.id,
          unit: t.apartamentos?.numero || 'S/N',
          morador: moradorNome || 'Sem morador',
          apartamento_id: t.apartamento_id,
          description: t.descricao,
          amount: t.valor,
          status: t.status,
          vencimento: t.vencimento,
          data_pagamento: t.data_pagamento
        };
      });
      setRevenues(formattedRevenues);

      // 3. Fetch Expenses (despesas)
      const { data: despesasData, error: despesasError } = await supabase
        .from('despesas')
        .select('*')
        .order('vencimento', { ascending: false });
      
      // If table despesas does not exist yet (migration error), fallback to empty
      let formattedExpenses = [];
      if (despesasError) {
        console.warn('Expenses table not ready yet. Run SQL migration.', despesasError);
      } else {
        formattedExpenses = (despesasData || []).map(d => ({
          id: d.id,
          description: d.descricao,
          amount: d.valor,
          status: d.status,
          vencimento: d.vencimento,
          categoria: d.categoria || 'Outros',
          data_pagamento: d.data_pagamento
        }));
      }
      setExpenses(formattedExpenses);

      // 4. Metrics are now calculated automatically via useMemo based on selected period.

    } catch (error) {
      console.error('Error fetching finance data:', error);
      showToast('Erro ao carregar dados financeiros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayment = async () => {
    const { item, type } = confirmPaymentModal;
    if (!item) return;

    try {
      setLoading(true);
      const now = new Date().toISOString();

      if (type === 'receita') {
        const { error } = await supabase
          .from('taxas')
          .update({ status: 'pago', data_pagamento: now })
          .eq('id', item.id);
        if (error) throw error;
        showToast('Receita marcada como PAGA!', 'success');
      } else {
        const { error } = await supabase
          .from('despesas')
          .update({ status: 'pago', data_pagamento: now })
          .eq('id', item.id);
        if (error) throw error;
        showToast('Despesa marcada como PAGA!', 'success');
      }

      setConfirmPaymentModal({ isOpen: false, item: null, type: '' });
      await fetchFinanceData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar pagamento: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    if (!revenueForm.apartamento_id || !revenueForm.descricao || !revenueForm.valor || !revenueForm.vencimento) {
      showToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    try {
      setLoading(true);
      const parsedVal = parseCurrency(revenueForm.valor);
      const isPaid = revenueForm.status === 'pago';

      let dataPagamento = null;
      if (isPaid) {
        if (editingItem && editingItem.status === 'pago' && editingItem.data_pagamento) {
          dataPagamento = editingItem.data_pagamento;
        } else {
          dataPagamento = new Date().toISOString();
        }
      }

      const payload = {
        apartamento_id: revenueForm.apartamento_id,
        descricao: revenueForm.descricao,
        valor: parsedVal,
        vencimento: revenueForm.vencimento,
        status: revenueForm.status,
        data_pagamento: dataPagamento
      };

      if (editingItem) {
        const { error } = await supabase
          .from('taxas')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showToast('Receita atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('taxas')
          .insert([payload]);
        if (error) throw error;
        showToast('Receita adicionada com sucesso!', 'success');
      }

      setShowRevenueModal(false);
      setEditingItem(null);
      setRevenueForm({ apartamento_id: '', descricao: '', valor: '', vencimento: '', status: 'pendente' });
      await fetchFinanceData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar receita: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.descricao || !expenseForm.valor || !expenseForm.vencimento) {
      showToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    try {
      setLoading(true);
      const parsedVal = parseCurrency(expenseForm.valor);
      const isPaid = expenseForm.status === 'pago';

      let dataPagamento = null;
      if (isPaid) {
        if (editingItem && editingItem.status === 'pago' && editingItem.data_pagamento) {
          dataPagamento = editingItem.data_pagamento;
        } else {
          dataPagamento = new Date().toISOString();
        }
      }

      const payload = {
        descricao: expenseForm.descricao,
        valor: parsedVal,
        vencimento: expenseForm.vencimento,
        status: expenseForm.status,
        categoria: expenseForm.categoria,
        data_pagamento: dataPagamento
      };

      if (editingItem) {
        const { error } = await supabase
          .from('despesas')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showToast('Despesa atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('despesas')
          .insert([payload]);
        if (error) throw error;
        showToast('Despesa registrada com sucesso!', 'success');
      }

      setShowExpenseModal(false);
      setEditingItem(null);
      setExpenseForm({ descricao: '', valor: '', vencimento: '', status: 'pendente', categoria: 'Outros' });
      await fetchFinanceData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar despesa. Certifique-se de executar as migrations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Formatting helpers
  const formatDate = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    // Add timezone offset correction
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeList = activeSection === 'receitas' ? periodRevenues : periodExpenses;

  const filteredList = activeList.filter(item => {
    if (filter === 'Todos') return true;
    if (filter === 'Pagos') return item.status === 'pago';
    if (filter === 'Pendentes') return item.status === 'pendente';
    return true;
  });

  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredList.forEach(item => {
      let groupKey;
      if (item.status === 'pendente') {
        groupKey = 'Pendentes';
      } else {
        if (item.data_pagamento) {
          const d = new Date(item.data_pagamento);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          groupKey = `Pago em ${day}/${month}/${year}`;
        } else {
          groupKey = 'Pagos (sem data)';
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Pendentes') return -1;
      if (b === 'Pendentes') return 1;
      if (a === 'Pagos (sem data)') return 1;
      if (b === 'Pagos (sem data)') return -1;
      const dateA = a.replace('Pago em ', '').split('/').reverse().join('');
      const dateB = b.replace('Pago em ', '').split('/').reverse().join('');
      return dateB.localeCompare(dateA);
    });

    return sortedKeys.map(key => ({
      label: key,
      items: groups[key]
    }));
  }, [filteredList]);

  return (
    <div className="finance-page">
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <Sparkles size={20} />}
          <span>{toast.text}</span>
        </div>
      )}

      <header className="page-header finance-header">
        <div className="header-top">
          <div>
            <h1>Financeiro</h1>
            <p className="sub-title">Balanço do Condomínio</p>
          </div>
          <div className="active-apartments-pill">
            <span className="dot animate-pulse"></span>
            <span>{stats.occupiedApts} de {stats.totalApts} Apts Ocupados (Gerando Receita)</span>
          </div>
        </div>

        <div className="period-filter-container">
          <Calendar size={18} className="period-icon" />
          <input 
            type="month" 
            className="period-input"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </header>

      {/* Primary Net Balance Stats Card */}
      <div className={`main-stats-card ${stats.netBalance >= 0 ? 'positive' : 'negative'}`}>
        <span className="card-label">Balanço Líquido Mensal</span>
        <div className="main-value">
          {stats.netBalance >= 0 ? '+' : '-'} R$ {Math.abs(stats.netBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div className="balance-breakdown">
          <span>Receitas: R$ {stats.totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span className="separator">|</span>
          <span>Despesas: R$ {stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Delinquency and Quick Metrics Card */}
      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-icon green">
            <ArrowUpRight size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Entradas Pagas</span>
            <span className="summary-value">R$ {stats.totalRevenues.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon red">
            <AlertTriangle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Taxa Inadimplência</span>
            <span className="summary-value">{stats.delinquencyRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Main Income vs Expense Navigation Tabs */}
      <div className="finance-section-tabs">
        <button 
          className={`tab-toggle-btn ${activeSection === 'receitas' ? 'active' : ''}`}
          onClick={() => { setActiveSection('receitas'); setFilter('Todos'); }}
        >
          <ArrowUpRight size={18} />
          <span>Receitas (Entradas)</span>
        </button>
        <button 
          className={`tab-toggle-btn ${activeSection === 'despesas' ? 'active' : ''}`}
          onClick={() => { setActiveSection('despesas'); setFilter('Todos'); }}
        >
          <ArrowDownRight size={18} />
          <span>Despesas (Saídas)</span>
        </button>
      </div>

      {/* List Filters */}
      <div className="filter-tabs">
        {['Todos', 'Pagos', 'Pendentes'].map(t => (
          <button 
            key={t}
            className={`tab-btn ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Transactions Section */}
      <section className="transactions-section">
        <div className="section-title-flex">
          <h2 className="section-title">
            {activeSection === 'receitas' ? 'Últimas Receitas' : 'Últimas Despesas'}
          </h2>
          <button 
            className="btn-add-shortcut"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            <span>{activeSection === 'receitas' ? 'Cobrar Apto' : 'Registrar Despesa'}</span>
          </button>
        </div>

        <div className="transactions-list">
          {loading ? (
            <div className="loading-state">Carregando dados financeiros...</div>
          ) : groupedTransactions.length === 0 ? (
            <div className="empty-state">Nenhum registro encontrado.</div>
          ) : (
            groupedTransactions.map(group => (
              <div key={group.label} className="transaction-group">
                <h3 className="group-label-header">{group.label}</h3>
                <div className="group-items">
                  {group.items.map((item) => (
                    <div key={item.id} className={`transaction-item ${item.status}`}>
                      <div className="transaction-item-inner">
                        {/* Top Status Bar: Clickable if pending, badge if paid */}
                        <div className="transaction-status-top">
                          {item.status === 'pendente' ? (
                            <button 
                              className="status-pill-btn pendente"
                              title="Confirmar Pagamento"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmPaymentModal({ 
                                  isOpen: true, 
                                  item, 
                                  type: activeSection === 'receitas' ? 'receita' : 'despesa' 
                                });
                              }}
                            >
                              <Check size={14} />
                              <span>Confirmar Pago</span>
                            </button>
                          ) : (
                            <div className="status-pill paid">
                              <Check size={14} />
                              <span>Pago</span>
                            </div>
                          )}
                        </div>

                        {/* Header Row: Unit/Resident Name and Amount */}
                        <div className="transaction-header">
                          <div className="apt-info">
                            <Building size={16} className="apt-icon" />
                            <span className="unit-name">
                              {activeSection === 'receitas' ? `Apto ${item.unit} - ${item.morador}` : item.description}
                            </span>
                          </div>
                          <span className="amount">
                            R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Payment Description / Category Row */}
                        <div className="transaction-description">
                          <span className="desc-text">
                            {activeSection === 'receitas' ? item.description : item.categoria}
                          </span>
                        </div>

                        {/* Due Date & Paid Date Badges Row */}
                        <div className="transaction-dates">
                          <div className="date-badge venc">
                            <Calendar size={12} />
                            <span>Venc: {formatDate(item.vencimento)}</span>
                          </div>
                          {item.status === 'pago' && item.data_pagamento && (
                            <div className="date-badge paid">
                              <Check size={12} />
                              <span>Pago em: {formatDateTime(item.data_pagamento)}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Row */}
                        <div className="transaction-actions-row">
                          <button 
                            className="btn-item-action edit"
                            title="Editar Lançamento"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                          >
                            <Pencil size={14} />
                            <span>Editar</span>
                          </button>
                          <button 
                            className="btn-item-action delete"
                            title="Excluir Lançamento"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmModal({ isOpen: true, item, type: activeSection === 'receitas' ? 'receita' : 'despesa' });
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Apagar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <button 
        className="fab" 
        onClick={handleOpenCreate}
      >
        <Plus size={24} />
      </button>

      {/* MODAL 1: REGISTRAR RECEITA (NOVA TAXA) */}
      {showRevenueModal && (
        <div className="modal-overlay" onClick={() => setShowRevenueModal(false)}>
          <div className="modal-content finance-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Cobrança' : 'Cobrar Apartamento'}</h2>
              <button className="close-btn" onClick={() => setShowRevenueModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddRevenue}>
              <div className="modal-body">
                <div className="form-section">
                  <label>Apartamento *</label>
                  <div className="input-wrapper">
                    <Building className="input-icon" size={20} />
                    <select
                      required
                      value={revenueForm.apartamento_id}
                      onChange={(e) => setRevenueForm({...revenueForm, apartamento_id: e.target.value})}
                    >
                      <option value="">Selecione a Unidade...</option>
                      {apartments.map(apt => {
                        const moradorNome = apt.moradores?.[0]?.nome;
                        return (
                          <option key={apt.id} value={apt.id}>
                            Apto {apt.numero} {apt.status === 'ocupado' ? ` - ${moradorNome || 'Ocupante'}` : ' (Vazio)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <label>Descrição da Cobrança *</label>
                  <div className="input-wrapper">
                    <Building2 className="input-icon" size={20} />
                    <input 
                      type="text" 
                      placeholder="Ex: Mensalidade de Aluguel" 
                      required
                      value={revenueForm.descricao}
                      onChange={(e) => setRevenueForm({...revenueForm, descricao: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-section">
                    <label>Valor *</label>
                    <div className="input-wrapper">
                      <DollarSign className="input-icon" size={20} />
                      <input 
                        type="text" 
                        placeholder="R$ 0,00" 
                        required
                        value={revenueForm.valor}
                        onChange={(e) => setRevenueForm({...revenueForm, valor: formatCurrency(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <label>Vencimento *</label>
                    <div className="input-wrapper">
                      <Calendar className="input-icon" size={20} />
                      <input 
                        type="date" 
                        required
                        value={revenueForm.vencimento}
                        onChange={(e) => setRevenueForm({...revenueForm, vencimento: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <label>Status de Entrada</label>
                  <div className="status-toggle-group">
                    <button
                      type="button"
                      className={`status-btn pendente ${revenueForm.status === 'pendente' ? 'active' : ''}`}
                      onClick={() => setRevenueForm({...revenueForm, status: 'pendente'})}
                    >
                      Pendente
                    </button>
                    <button
                      type="button"
                      className={`status-btn pago ${revenueForm.status === 'pago' ? 'active' : ''}`}
                      onClick={() => setRevenueForm({...revenueForm, status: 'pago'})}
                    >
                      Pago
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowRevenueModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Lançar Receita')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR DESPESA (NOVA DESPESA) */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-content finance-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Despesa' : 'Registrar Despesa'}</h2>
              <button className="close-btn" onClick={() => setShowExpenseModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="modal-body">
                <div className="form-section">
                  <label>Descrição da Despesa *</label>
                  <div className="input-wrapper">
                    <Building2 className="input-icon" size={20} />
                    <input 
                      type="text" 
                      placeholder="Ex: Reparo Hidráulico" 
                      required
                      value={expenseForm.descricao}
                      onChange={(e) => setExpenseForm({...expenseForm, descricao: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-section">
                    <label>Valor *</label>
                    <div className="input-wrapper">
                      <DollarSign className="input-icon" size={20} />
                      <input 
                        type="text" 
                        placeholder="R$ 0,00" 
                        required
                        value={expenseForm.valor}
                        onChange={(e) => setExpenseForm({...expenseForm, valor: formatCurrency(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <label>Vencimento *</label>
                    <div className="input-wrapper">
                      <Calendar className="input-icon" size={20} />
                      <input 
                        type="date" 
                        required
                        value={expenseForm.vencimento}
                        onChange={(e) => setExpenseForm({...expenseForm, vencimento: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <label>Categoria</label>
                  <div className="input-wrapper">
                    <Building className="input-icon" size={20} />
                    <select
                      value={expenseForm.categoria}
                      onChange={(e) => setExpenseForm({...expenseForm, categoria: e.target.value})}
                    >
                      <option value="Manutenção">Manutenção</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Água/Luz">Água/Luz</option>
                      <option value="Segurança">Segurança</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <label>Status de Saída</label>
                  <div className="status-toggle-group">
                    <button
                      type="button"
                      className={`status-btn pendente ${expenseForm.status === 'pendente' ? 'active' : ''}`}
                      onClick={() => setExpenseForm({...expenseForm, status: 'pendente'})}
                    >
                      Pendente
                    </button>
                    <button
                      type="button"
                      className={`status-btn pago ${expenseForm.status === 'pago' ? 'active' : ''}`}
                      onClick={() => setExpenseForm({...expenseForm, status: 'pago'})}
                    >
                      Pago
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowExpenseModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary danger" disabled={loading}>
                  {loading ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Registrar Saída')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE PAGAMENTO QUICK OVERLAY MODAL */}
      {confirmPaymentModal.isOpen && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmPaymentModal({ isOpen: false, item: null, type: '' })}>
          <div className="confirm-modal-card success" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon success">
              <Check size={32} />
            </div>
            <h2 className="confirm-modal-title">Confirmar Recebimento / Pagamento</h2>
            <p className="confirm-modal-text">Você confirma o recebimento/pagamento do seguinte registro?</p>
            
            <div className="confirm-modal-summary">
              <span className="summary-title">
                {confirmPaymentModal.type === 'receita' 
                  ? `Apartamento ${confirmPaymentModal.item.unit} - ${confirmPaymentModal.item.morador}` 
                  : confirmPaymentModal.item.description}
              </span>
              <span className="summary-desc">{confirmPaymentModal.item.description}</span>
              <span className={`summary-amount ${confirmPaymentModal.type === 'receita' ? 'income' : 'expense'}`}>
                R$ {confirmPaymentModal.item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <p className="confirm-modal-text" style={{ fontSize: '0.85rem', marginBottom: '24px' }}>
              A data e o horário atual serão salvos permanentemente como a data deste pagamento.
            </p>

            <div className="confirm-modal-actions">
              <button 
                type="button" 
                className="btn-confirm-cancel" 
                onClick={() => setConfirmPaymentModal({ isOpen: false, item: null, type: '' })}
                disabled={loading}
              >
                Voltar
              </button>
              <button 
                type="button" 
                className="btn-confirm-success" 
                onClick={handleTogglePayment}
                disabled={loading}
              >
                <Check size={18} />
                <span>{loading ? 'Salvando...' : 'Sim, Confirmar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE DELEÇÃO */}
      {deleteConfirmModal.isOpen && (
        <div className="confirm-modal-overlay" onClick={() => setDeleteConfirmModal({ isOpen: false, item: null, type: '' })}>
          <div className="confirm-modal-card danger" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon danger">
              <Trash2 size={32} />
            </div>
            <h2 className="confirm-modal-title">Excluir Registro Financeiro</h2>
            <p className="confirm-modal-text">Você tem certeza que deseja excluir permanentemente este lançamento?</p>
            
            <div className="confirm-modal-summary">
              <span className="summary-title">
                {deleteConfirmModal.type === 'receita' 
                  ? `Apto ${deleteConfirmModal.item.unit} - ${deleteConfirmModal.item.morador}` 
                  : deleteConfirmModal.item.description}
              </span>
              <span className="summary-desc">{deleteConfirmModal.item.description}</span>
              <span className="summary-amount expense">
                R$ {deleteConfirmModal.item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="confirm-modal-warning">
              <AlertTriangle size={18} />
              <span>Atenção: Esta ação é definitiva e não poderá ser desfeita.</span>
            </div>

            <div className="confirm-modal-actions">
              <button 
                type="button" 
                className="btn-confirm-cancel" 
                onClick={() => setDeleteConfirmModal({ isOpen: false, item: null, type: '' })}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-confirm-danger" 
                onClick={handleDeleteTransaction}
                disabled={loading}
              >
                <Trash2 size={18} />
                <span>{loading ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
