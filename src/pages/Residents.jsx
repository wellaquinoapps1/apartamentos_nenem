import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  UserPlus, 
  User, 
  Phone,
  Plus,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import './Residents.css';

const Residents = () => {
  const [residents, setResidents] = useState([]);
  const [stats, setStats] = useState({ ativos: 0, pendentes: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Todos'); // 'Todos', 'ativos', 'pendentes'
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '', apto_id: null });
  const [detailModal, setDetailModal] = useState({ isOpen: false, resident: null });

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
          apartamentos(id, numero)
        `)
        .order('nome', { ascending: true });

      if (error) throw error;

      const formattedData = data.map(res => ({
        id: res.id,
        name: res.nome,
        cpf: res.cpf || '--',
        apto: res.apartamentos?.numero || 'S/N',
        apto_id: res.apartamentos?.id || null,
        phone: res.telefone || '--',
        email: res.email || '--',
        status: res.apartamentos?.numero ? 'ativo' : 'pendente',
        foto_url: res.foto_url,
        local_trabalho: res.local_trabalho || '--',
        dia_pagamento: res.dia_pagamento || null
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

  const handleDelete = async (id, apartamentoId) => {
    try {
      setLoading(true);
      // 1. Delete resident
      const { error: deleteError } = await supabase
        .from('moradores')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // 2. Set the apartment status back to vacant
      if (apartamentoId) {
        const { error: aptError } = await supabase
          .from('apartamentos')
          .update({
            status: 'vazio',
            qtd_pessoas: null,
            data_entrada: null,
            data_saida: null
          })
          .eq('id', apartamentoId);

        if (aptError) throw aptError;
      }

      setDeleteModal({ isOpen: false, id: null, name: '', apto_id: null });
      alert('Morador excluído com sucesso!');
      await fetchResidents();
    } catch (error) {
      console.error('Error deleting resident:', error);
      alert('Erro ao excluir morador: ' + error.message);
      setLoading(false);
    }
  };

  const filteredResidents = residents.filter(res => {
    const matchesSearch = res.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          res.apto.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'ativos') return res.status === 'ativo';
    if (filter === 'pendentes') return res.status === 'pendente';
    return true;
  });

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
        <div 
          className={`r-stat-card ${filter === 'ativos' ? 'active-filter' : 'outline'}`}
          onClick={() => setFilter(filter === 'ativos' ? 'Todos' : 'ativos')}
          style={{ cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', opacity: filter === 'pendentes' ? 0.6 : 1 }}
          title="Clique para filtrar moradores ativos nos aptos"
        >
          <CheckCircle size={20} className="stat-icon" color={filter === 'ativos' ? '#ffffff' : '#2563eb'} />
          <div className="r-stat-info">
            <span className="r-stat-value">{stats.ativos}</span>
            <span className="r-stat-label">ATIVOS NOS APTOS</span>
          </div>
        </div>
        <div 
          className={`r-stat-card ${filter === 'pendentes' ? 'active-filter' : 'outline'}`}
          onClick={() => setFilter(filter === 'pendentes' ? 'Todos' : 'pendentes')}
          style={{ cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', opacity: filter === 'ativos' ? 0.6 : 1 }}
          title="Clique para filtrar moradores sem apto"
        >
          <Clock size={20} className="stat-icon" color={filter === 'pendentes' ? '#ffffff' : '#ef4444'} />
          <div className="r-stat-info">
            <span className="r-stat-value">{stats.pendentes}</span>
            <span className="r-stat-label">SEM APTO (PENDENTES)</span>
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
            <div 
              key={res.id} 
              className={`resident-item clickable ${res.status === 'ativo' ? 'ativo' : ''}`}
              onClick={() => setDetailModal({ isOpen: true, resident: res })}
            >
              <div className="resident-avatar">
                {res.foto_url ? (
                  <img src={res.foto_url} alt={res.name} className="avatar-img" />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div className="resident-info">
                <div className="name-row">
                  <span className="res-name">{res.name}</span>
                  {res.apto !== 'S/N' && (
                    <span className="res-apto">Apto {res.apto}</span>
                  )}
                </div>
                <div className="phone-row">
                  <Phone size={14} />
                  <span>{res.phone}</span>
                </div>
              </div>
              <div className="resident-actions">
                <Link 
                  to={`/moradores/editar/${res.id}`} 
                  className="action-btn edit" 
                  title="Editar"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil size={16} />
                </Link>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModal({ isOpen: true, id: res.id, name: res.name, apto_id: res.apto_id });
                  }} 
                  className="action-btn delete" 
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Link to="/moradores/novo" className="fab">
        <Plus size={24} />
      </Link>

      {deleteModal.isOpen && (
        <div className="confirm-modal-overlay" onClick={() => setDeleteModal({ isOpen: false, id: null, name: '', apto_id: null })}>
          <div className="confirm-modal-card" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon danger">
              <Trash2 size={32} />
            </div>
            <h2 className="confirm-modal-title">Confirmar Exclusão</h2>
            <p className="confirm-modal-text">
              Tem certeza que deseja excluir o morador <strong>{deleteModal.name}</strong>?
            </p>
            <div className="confirm-modal-warning">
              <AlertTriangle size={18} />
              <span>Esta ação não poderá ser desfeita e o apartamento ficará vazio.</span>
            </div>
            <div className="confirm-modal-actions">
              <button 
                type="button"
                className="btn-confirm-cancel" 
                onClick={() => setDeleteModal({ isOpen: false, id: null, name: '', apto_id: null })}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="btn-confirm-danger" 
                onClick={() => handleDelete(deleteModal.id, deleteModal.apto_id)}
                disabled={loading}
              >
                <Trash2 size={18} />
                <span>{loading ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal.isOpen && detailModal.resident && (
        <div className="modal-overlay" onClick={() => setDetailModal({ isOpen: false, resident: null })}>
          <div className="modal-content profile-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-detail-header">
              <div className="profile-avatar-large">
                {detailModal.resident.foto_url ? (
                  <img src={detailModal.resident.foto_url} alt={detailModal.resident.name} />
                ) : (
                  <User size={48} />
                )}
              </div>
              <div className="profile-header-info">
                <h2>{detailModal.resident.name}</h2>
                <div className="badge-row">
                  {detailModal.resident.apto !== 'S/N' && (
                    <span className="res-apto-badge">Apto {detailModal.resident.apto}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-body profile-detail-body">
              <div className="detail-section">
                <h3>Informações Pessoais</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">CPF</span>
                    <span className="detail-value">{detailModal.resident.cpf}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Telefone</span>
                    <span className="detail-value">{detailModal.resident.phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">E-mail</span>
                    <span className="detail-value">{detailModal.resident.email}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Trabalho e Vencimento</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Local de Trabalho</span>
                    <span className="detail-value">{detailModal.resident.local_trabalho}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Dia de Pagamento</span>
                    <span className="detail-value">
                      {detailModal.resident.dia_pagamento 
                        ? `Todo dia ${detailModal.resident.dia_pagamento}` 
                        : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <Link 
                to={`/moradores/editar/${detailModal.resident.id}`}
                className="btn-edit-shortcut"
              >
                <Pencil size={18} />
                <span>Editar Cadastro</span>
              </Link>
              <button 
                className="btn-close-detail" 
                onClick={() => setDetailModal({ isOpen: false, resident: null })}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Residents;
