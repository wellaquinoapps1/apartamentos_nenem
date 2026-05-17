import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Users,
  Wallet,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  User
} from 'lucide-react';
import { getSettings } from '../lib/settings';
import './Dashboard.css';
import ApartmentDetailsModal from '../components/ApartmentDetailsModal';

const Dashboard = () => {
  const [stats, setStats] = useState({
    apartamentos: 0,
    moradores: 0,
    pendencias: 0,
    ocorrencias: 0,
    aptosOcupados: 0,
    aptosLivres: 0
  });
  const [activities, setActivities] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAptoId, setSelectedAptoId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState(getSettings());

  const fetchStats = async () => {
    try {
      const { count: aptos } = await supabase.from('apartamentos').select('*', { count: 'exact', head: true });
      const { count: moradores } = await supabase.from('moradores').select('*', { count: 'exact', head: true });
      const { count: pendencias } = await supabase.from('taxas').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
      const { count: ocorrencias } = await supabase.from('ocorrencias').select('*', { count: 'exact', head: true }).eq('status', 'aberta');

      // Fetch apartments with residents
      const { data: aptosData } = await supabase
        .from('apartamentos')
        .select('*, moradores(nome, foto_url)');

      const aptosList = aptosData || [];
      const aptosOcupados = aptosList.filter(a => a.status === 'ocupado').length;
      const aptosLivres = aptosList.filter(a => a.status === 'vazio' || a.status !== 'ocupado').length;

      setStats({
        apartamentos: aptos || aptosList.length || 0,
        moradores: moradores || 0,
        pendencias: pendencias || 0,
        ocorrencias: ocorrencias || 0,
        aptosOcupados,
        aptosLivres
      });

      const sortedAptos = aptosList.sort((a, b) =>
        a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' })
      );
      setApartments(sortedAptos);

      // Fetch recent activities
      const { data: recentTaxas } = await supabase
        .from('taxas')
        .select('*, apartamentos(numero, moradores(nome))')
        .order('created_at', { ascending: false })
        .limit(2);

      const { data: recentOcorrencias } = await supabase
        .from('ocorrencias')
        .select('*, apartamentos(numero, moradores(nome))')
        .order('created_at', { ascending: false })
        .limit(2);

      const combinedActivities = [
        ...(recentTaxas || []).map(t => {
          const moradorNome = t.apartamentos?.moradores?.[0]?.nome;
          const moradorFoto = t.apartamentos?.moradores?.[0]?.foto_url;
          return {
            id: `tax-${t.id}`,
            type: 'taxa',
            title: moradorNome ? `Apto ${t.apartamentos?.numero} - ${moradorNome}` : `Apto ${t.apartamentos?.numero}`,
            message: t.status === 'pago' ? 'pagou o condomínio.' : 'tem uma nova taxa pendente.',
            time: new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: t.status === 'pago' ? 'success' : 'warning',
            fotoUrl: moradorFoto,
            shortName: moradorNome || `Apto ${t.apartamentos?.numero}`
          };
        }),
        ...(recentOcorrencias || []).map(o => {
          const moradorNome = o.apartamentos?.moradores?.[0]?.nome;
          const moradorFoto = o.apartamentos?.moradores?.[0]?.foto_url;
          return {
            id: `oc-${o.id}`,
            type: 'ocorrencia',
            title: `Nova Ocorrência:`,
            message: `${o.descricao} (Apto ${o.apartamentos?.numero}${moradorNome ? ` - ${moradorNome}` : ''})`,
            time: new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'warning',
            fotoUrl: moradorFoto,
            shortName: moradorNome || `Apto ${o.apartamentos?.numero}`
          };
        })
      ].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);

      setActivities(combinedActivities);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleUpdate = () => setSettings(getSettings());
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => window.removeEventListener('settingsUpdated', handleUpdate);
  }, []);

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <h1>{settings.nomeResidencial}</h1>
        <p>Painel do Administrador</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.apartamentos}</span>
            <span className="stat-label">APARTAMENTOS</span>
            <div className="apt-status-badges" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                {stats.aptosOcupados} Ocupados
              </span>
              <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                {stats.aptosLivres} Livres
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.moradores}</span>
            <span className="stat-label">MORADORES</span>
          </div>
        </div>

        <div className="stat-card danger-theme">
          <div className="stat-header">
            <span className="stat-label">CONTAS PENDENTES</span>
          </div>
          <div className="stat-body">
            <span className="stat-value">{stats.pendencias}</span>
            <div className="stat-badge">
              <Wallet size={20} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">OCORRÊNCIAS EM ABERTO</span>
            <button className="text-link">Ver Todas</button>
          </div>
          <div className="stat-body">
            <span className="stat-value">{stats.ocorrencias}</span>
          </div>
        </div>
      </div>


      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Ocupação dos Apartamentos</h2>
          <Link to="/apartamentos" className="text-link">Ver Todos</Link>
        </div>
        <div className="apartments-grid">
          {apartments.map((apto) => {
            const hasResident = apto.moradores && apto.moradores.length > 0;
            const residentName = hasResident ? apto.moradores[0].nome : null;
            const residentFoto = hasResident ? apto.moradores[0].foto_url : null;
            const isOccupied = apto.status === 'ocupado';

            return (
              <div
                key={apto.id}
                className="apt-card-dashboard"
                onClick={() => {
                  setSelectedAptoId(apto.id);
                  setIsModalOpen(true);
                }}
              >
                <div className="apt-card-status">
                  <span className={`apt-badge ${isOccupied ? 'occupied' : 'vacant'}`}>
                    {isOccupied ? 'Ocupado' : 'Vazio'}
                  </span>
                </div>
                <div className="apt-card-title">
                  <span className="apt-number">Apto {apto.numero}</span>
                </div>
                <div className="apt-card-body">
                  {residentFoto ? (
                    <img src={residentFoto} alt={residentName} className="apt-resident-thumb" />
                  ) : (
                    <User size={14} className={hasResident ? 'icon-active' : 'icon-muted'} />
                  )}
                  <span className={`apt-resident ${hasResident ? 'has-resident' : 'no-resident'}`} title={residentName || 'Sem morador'}>
                    {hasResident ? residentName : 'Sem morador'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Atividades Recentes</h2>
          <button className="icon-btn">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="activity-list card">
          {activities.length === 0 ? (
            <div className="empty-state-padding">Nenhuma atividade recente.</div>
          ) : (
            activities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="avatar-wrapper">
                  {activity.fotoUrl ? (
                    <img src={activity.fotoUrl} alt={activity.shortName} />
                  ) : (
                    <img src={`https://ui-avatars.com/api/?name=${activity.shortName}&background=random`} alt="User Avatar" />
                  )}
                  
                  {activity.type === 'taxa' && activity.status === 'success' && (
                    <div className="status-badge success">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                  {activity.type === 'taxa' && activity.status === 'warning' && (
                    <div className="status-badge warning" style={{ backgroundColor: '#f59e0b', color: 'white', borderColor: 'white' }}>
                      <AlertCircle size={12} />
                    </div>
                  )}
                  {activity.type === 'ocorrencia' && (
                    <div className="status-badge warning" style={{ backgroundColor: '#ef4444', color: 'white', borderColor: 'white' }}>
                      <AlertCircle size={12} />
                    </div>
                  )}
                </div>
                <div className="activity-content">
                  <p><strong>{activity.title}</strong> {activity.message}</p>
                  <span className="timestamp">Hoje às {activity.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <ApartmentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        apartmentId={selectedAptoId}
        onUpdate={fetchStats}
      />
    </div>
  );
};

export default Dashboard;
