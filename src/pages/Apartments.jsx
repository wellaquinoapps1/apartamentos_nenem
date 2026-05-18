import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search,
  User,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Filter,
  Calendar,
  Users
} from 'lucide-react';
import { getSettings } from '../lib/settings';
import './Apartments.css';
import ApartmentDetailsModal from '../components/ApartmentDetailsModal';

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [selectedAptoId, setSelectedAptoId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    fetchApartments();
    const handleUpdate = () => setSettings(getSettings());
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => window.removeEventListener('settingsUpdated', handleUpdate);
  }, []);

  const fetchApartments = async () => {
    try {
      setLoading(true);
      // Fetch apartments with their residents and latest pending/paid tax
      const { data, error } = await supabase
        .from('apartamentos')
        .select(`
          *,
          moradores(nome, foto_url),
          taxas(status)
        `)
        .order('numero', { ascending: true });

      if (error) throw error;

      // Simplify data structure for the UI
      const formattedData = data.map(apto => ({
        id: apto.id,
        numero: apto.numero,
        block: 'A', // Default block
        status: apto.status.toUpperCase(),
        resident: apto.moradores?.[0]?.nome || 'Nenhum morador',
        resident_foto: apto.moradores?.[0]?.foto_url || null,
        financial: apto.taxas?.some(t => t.status === 'pendente') ? 'Pendente' : 'Pago',
        rent: apto.valor_aluguel,
        people: apto.qtd_pessoas,
        entry: apto.data_entrada ? new Date(apto.data_entrada).toLocaleDateString('pt-BR') : '--',
        exit: apto.data_saida ? new Date(apto.data_saida).toLocaleDateString('pt-BR') : '--'
      }));

      // Sort naturally (numerical ascending order)
      const sortedData = formattedData.sort((a, b) =>
        a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' })
      );

      setApartments(sortedData);
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
    if (filter === 'Vagos') return matchesSearch && (apto.status === 'VAGO' || apto.status === 'VAZIO');
    if (filter === 'Inadimplente.') return matchesSearch && apto.financial === 'Pendente';
    return matchesSearch;
  });

  return (
    <div className="apartments-page">
      <header className="page-header">
        <h1>Apartamentos</h1>
        <p>Gestão de unidades e ocupação do {settings.nomeResidencial}.</p>
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
          {['Todos', 'Ocupados', 'Vagos', 'Inadimplente.'].map(f => (
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
            <div
              key={apto.id}
              className="apto-card"
              onClick={() => {
                setSelectedAptoId(apto.id);
                setIsModalOpen(true);
              }}
            >
              <div className="apto-card-header">
                <div className="apto-info">
                  <h3>Apto {apto.numero}</h3>
                  <span className="apto-block">Bloco {apto.block}</span>
                </div>
                <span className={`apto-status-badge ${apto.status.toLowerCase()}`}>
                  {apto.status}
                </span>
              </div>

              <div className="apto-card-body">
                <div className="apto-detail">
                  {apto.resident_foto ? (
                    <img src={apto.resident_foto} alt={apto.resident} className="apto-resident-thumb" />
                  ) : (
                    <User size={18} />
                  )}
                  <span className={`apto-resident-name ${apto.resident === 'Nenhum morador' ? 'muted' : ''}`}>
                    {apto.resident}
                  </span>
                </div>
                {apto.people > 0 && (
                  <div className="apto-detail">
                    <Users size={18} />
                    <span>
                      <span className="detail-label">Moradores: </span>
                      <strong>{apto.people} {apto.people === 1 ? 'pessoa' : 'pessoas'}</strong>
                    </span>
                  </div>
                )}
                <div className="apto-detail">
                  <Wallet size={18} />
                  <span><span className="detail-label">Aluguel: </span><strong>R$ {apto.rent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                </div>
                <div className="apto-dates">
                  <div className="apto-detail mini">
                    <Calendar size={14} />
                    <span><span className="detail-label">Entrada: </span>{apto.entry}</span>
                  </div>
                  {apto.exit !== '--' && (
                    <div className="apto-detail mini">
                      <Calendar size={14} />
                      <span><span className="detail-label">Saída: </span>{apto.exit}</span>
                    </div>
                  )}
                </div>
                <div className="apto-detail status-row">
                  <span className="detail-label">Financeiro:</span>
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

      <ApartmentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        apartmentId={selectedAptoId}
        onUpdate={fetchApartments}
      />
    </div>
  );
};

export default Apartments;
