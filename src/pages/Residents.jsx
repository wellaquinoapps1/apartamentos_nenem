import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  UserPlus, 
  User, 
  ChevronRight,
  Phone,
  Plus,
  CheckCircle,
  Clock
} from 'lucide-react';
import './Residents.css';

const Residents = () => {
  const [residents, setResidents] = useState([]);
  const [stats, setStats] = useState({ ativos: 0, pendentes: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('moradores')
        .select(`
          *,
          apartamentos(numero)
        `)
        .order('nome', { ascending: true });

      if (error) throw error;

      const formattedData = data.map(res => ({
        id: res.id,
        name: res.nome,
        apto: res.apartamentos?.numero || 'S/N',
        phone: res.telefone || '--',
        status: res.cpf ? 'ativo' : 'pendente' // Business logic: if CPF exists, it's active
      }));

      setResidents(formattedData);
      
      const ativos = formattedData.filter(r => r.status === 'ativo').length;
      const pendentes = formattedData.filter(r => r.status === 'pendente').length;
      setStats({ ativos, pendentes });

    } catch (error) {
      console.error('Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResidents = residents.filter(res => 
    res.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.apto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="residents-page">
      <div className="page-header-flex">
        <header className="page-header">
          <h1>Moradores</h1>
          <p>{residents.length} cadastrados</p>
        </header>
        <Link to="/moradores/novo" className="add-btn-desktop">
          <UserPlus size={18} />
          <span>Novo Morador</span>
        </Link>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou apto..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="residents-stats">
        <div className="r-stat-card blue">
          <CheckCircle size={20} />
          <div className="r-stat-info">
            <span className="r-stat-value">{stats.ativos}</span>
            <span className="r-stat-label">ATIVOS</span>
          </div>
        </div>
        <div className="r-stat-card outline">
          <Clock size={20} color="#ef4444" />
          <div className="r-stat-info">
            <span className="r-stat-value">{stats.pendentes}</span>
            <span className="r-stat-label">PENDENTES</span>
          </div>
        </div>
      </div>

      <div className="residents-list">
        {loading ? (
          <div className="loading-state">Carregando moradores...</div>
        ) : filteredResidents.length === 0 ? (
          <div className="empty-state">Nenhum morador encontrado.</div>
        ) : (
          filteredResidents.map((res) => (
            <div key={res.id} className="resident-item">
              <div className="resident-avatar">
                <User size={24} />
              </div>
              <div className="resident-info">
                <div className="name-row">
                  <span className="res-name">{res.name}</span>
                  <span className="res-apto">Apto {res.apto}</span>
                </div>
                <div className="phone-row">
                  <Phone size={14} />
                  <span>{res.phone}</span>
                </div>
              </div>
              {res.status === 'pendente' && (
                <span className="status-badge-res">PENDENTE</span>
              )}
              <ChevronRight className="arrow-icon" size={20} />
            </div>
          ))
        )}
      </div>

      <Link to="/moradores/novo" className="fab">
        <Plus size={24} />
      </Link>
    </div>
  );
};

export default Residents;
