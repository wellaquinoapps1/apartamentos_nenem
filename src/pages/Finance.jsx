import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Wallet, 
  AlertTriangle, 
  Search,
  Building2,
  Plus
} from 'lucide-react';
import './Finance.css';

const Finance = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ total: 0, balance: 0, delinquency: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('taxas')
        .select(`
          *,
          apartamentos(numero)
        `)
        .order('vencimento', { ascending: false });

      if (error) throw error;

      const formattedData = data.map(t => ({
        id: t.id,
        unit: t.apartamentos?.numero || 'S/N',
        type: t.descricao,
        amount: t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        status: t.status.toUpperCase(),
        rawValue: t.valor
      }));

      setTransactions(formattedData);

      // Simple calculation for demo
      const total = formattedData.reduce((acc, curr) => acc + curr.rawValue, 0);
      const balance = formattedData.filter(t => t.status === 'PAGO').reduce((acc, curr) => acc + curr.rawValue, 0);
      const delinquency = formattedData.length > 0 
        ? (formattedData.filter(t => t.status === 'PENDENTE').length / formattedData.length) * 100 
        : 0;

      setStats({ 
        total: total.toLocaleString('pt-BR'), 
        balance: (balance / 1000).toFixed(1) + 'k', 
        delinquency: delinquency.toFixed(1) + '%' 
      });

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'Todos') return true;
    if (filter === 'Pagos') return t.status === 'PAGO';
    if (filter === 'Pendentes') return t.status === 'PENDENTE';
    return true;
  });

  return (
    <div className="finance-page">
      <header className="page-header finance-header">
        <div className="header-top">
          <h1>Financeiro</h1>
          <div className="header-icons">
            <Search size={24} />
          </div>
        </div>
      </header>

      <div className="main-stats-card">
        <span className="card-label">Total Coletado</span>
        <div className="main-value">R$ {stats.total}</div>
        <div className="trend positive">
          <TrendingUp size={16} />
          <span>+12% vs mês anterior</span>
        </div>
      </div>

      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-icon blue">
            <Wallet size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Balanço Geral</span>
            <span className="summary-value">R$ {stats.balance}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon red">
            <AlertTriangle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Inadimplência</span>
            <span className="summary-value">{stats.delinquency}</span>
          </div>
        </div>
      </div>

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

      <section className="transactions-section">
        <h2 className="section-title">Últimas Movimentações</h2>
        <div className="transactions-list">
          {loading ? (
            <div className="loading-state">Carregando movimentações...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">Nenhuma movimentação encontrada.</div>
          ) : (
            filteredTransactions.map((t) => (
              <div key={t.id} className="transaction-item">
                <div className="item-icon">
                  <Building2 size={20} />
                </div>
                <div className="item-details">
                  <div className="item-main">
                    <span className="unit-name">Unidade {t.unit}</span>
                    <span className="amount">R$ {t.amount}</span>
                  </div>
                  <div className="item-sub">
                    <span className="type-label">{t.type}</span>
                    <span className={`status-tag ${t.status.toLowerCase()}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <button className="fab">
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Finance;
