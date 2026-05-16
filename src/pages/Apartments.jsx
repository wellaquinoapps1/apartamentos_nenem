import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  User, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Filter
} from 'lucide-react';
import './Apartments.css';

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      setLoading(true);
      // Fetch apartments with their residents and latest pending/paid tax
      const { data, error } = await supabase
        .from('apartamentos')
        .select(`
          *,
          moradores(nome),
          taxas(status)
        `)
        .order('numero', { ascending: true });

      if (error) throw error;
      
      // Simplify data structure for the UI
      const formattedData = data.map(apto => ({
        id: apto.id,
        numero: apto.numero,
        block: 'A', // Default block as seen in designs
        status: apto.status.toUpperCase(),
        resident: apto.moradores?.[0]?.nome || 'Nenhum morador',
        financial: apto.taxas?.some(t => t.status === 'pendente') ? 'Pendente' : 'Pago'
      }));

      setApartments(formattedData);
    } catch (error) {
      console.error('Error fetching apartments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApartments = apartments.filter(apto => {
    const matchesSearch = apto.numero.includes(searchTerm) || 
                         apto.resident.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'Todos') return matchesSearch;
    if (filter === 'Ocupados') return matchesSearch && apto.status === 'OCUPADO';
    if (filter === 'Vagos') return matchesSearch && apto.status === 'VAGO';
    if (filter === 'Inadim.') return matchesSearch && apto.financial === 'Pendente';
    return matchesSearch;
  });

  return (
    <div className="apartments-page">
      <header className="page-header">
        <h1>Apartamentos</h1>
        <p>Gestão de unidades e ocupação do Residencial Vista.</p>
      </header>

      <div className="search-filter-container">
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Buscar por apto ou morador..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-chips">
          {['Todos', 'Ocupados', 'Vagos', 'Inadim.'].map(f => (
            <button 
              key={f}
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="apartments-list">
        {loading ? (
          <div className="loading-state">Carregando apartamentos...</div>
        ) : filteredApartments.length === 0 ? (
          <div className="empty-state">Nenhum apartamento encontrado.</div>
        ) : (
          filteredApartments.map((apto) => (
            <div key={apto.id} className="apto-card">
              <div className="apto-card-header">
                <div className="apto-info">
                  <h3>Apto {apto.numero}</h3>
                  <span className="apto-block">Bloco {apto.block}</span>
                </div>
                <span className={`status-badge ${apto.status.toLowerCase()}`}>
                  {apto.status}
                </span>
              </div>
              
              <div className="apto-card-body">
                <div className="apto-detail">
                  <User size={18} />
                  <span className={apto.resident === 'Nenhum morador' ? 'muted' : ''}>
                    {apto.resident}
                  </span>
                </div>
                <div className="apto-detail">
                  <Wallet size={18} />
                  <span>Financeiro:</span>
                  <div className={`finance-status ${apto.financial.toLowerCase()}`}>
                    {apto.financial === 'Pago' && <CheckCircle2 size={16} />}
                    {apto.financial === 'Pendente' && <AlertCircle size={16} />}
                    <span>{apto.financial}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="fab">
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Apartments;
