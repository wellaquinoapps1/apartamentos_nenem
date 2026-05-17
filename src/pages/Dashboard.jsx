import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Building2, 
  Users, 
  Wallet, 
  AlertCircle, 
  Megaphone, 
  UserPlus, 
  FileText,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  User
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    apartamentos: 0,
    moradores: 0,
    pendencias: 0,
    ocorrencias: 0
  });
  const [activities, setActivities] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: aptos } = await supabase.from('apartamentos').select('*', { count: 'exact', head: true });
        const { count: moradores } = await supabase.from('moradores').select('*', { count: 'exact', head: true });
        const { count: pendencias } = await supabase.from('taxas').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
        const { count: ocorrencias } = await supabase.from('ocorrencias').select('*', { count: 'exact', head: true }).eq('status', 'aberta');

        setStats({
          apartamentos: aptos || 0,
          moradores: moradores || 0,
          pendencias: pendencias || 0,
          ocorrencias: ocorrencias || 0
        });

        // Fetch apartments with residents
        const { data: aptosData } = await supabase
          .from('apartamentos')
          .select('*, moradores(nome)');

        const sortedAptos = (aptosData || []).sort((a, b) => 
          a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' })
        );
        setApartments(sortedAptos);

        // Fetch recent activities
        const { data: recentTaxas } = await supabase
          .from('taxas')
          .select('*, apartamentos(numero)')
          .order('created_at', { ascending: false })
          .limit(2);

        const { data: recentOcorrencias } = await supabase
          .from('ocorrencias')
          .select('*, apartamentos(numero)')
          .order('created_at', { ascending: false })
          .limit(2);

        const combinedActivities = [
          ...(recentTaxas || []).map(t => ({
            id: `tax-${t.id}`,
            type: 'taxa',
            title: `Unidade ${t.apartamentos?.numero}`,
            message: t.status === 'pago' ? 'pagou o condomínio.' : 'tem uma nova taxa pendente.',
            time: new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: t.status === 'pago' ? 'success' : 'warning'
          })),
          ...(recentOcorrencias || []).map(o => ({
            id: `oc-${o.id}`,
            type: 'ocorrencia',
            title: `Nova Ocorrência:`,
            message: `${o.descricao} (Apto ${o.apartamentos?.numero})`,
            time: new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'warning'
          }))
        ].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);

        setActivities(combinedActivities);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <h1>Residencial Vista</h1>
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
        <h2 className="section-title">Ações Rápidas</h2>
        <div className="quick-actions">
          <button className="action-btn">
            <div className="action-icon blue">
              <Megaphone size={24} />
            </div>
            <span>Novo Comunicado</span>
          </button>
          <Link to="/moradores/novo" className="action-btn">
            <div className="action-icon purple">
              <UserPlus size={24} />
            </div>
            <span>Add Morador</span>
          </Link>
          <button className="action-btn">
            <div className="action-icon navy">
              <FileText size={24} />
            </div>
            <span>Gerar Boleto</span>
          </button>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Ocupação das Unidades</h2>
          <Link to="/apartamentos" className="text-link">Ver Todos</Link>
        </div>
        <div className="apartments-grid">
          {apartments.map((apto) => {
            const hasResident = apto.moradores && apto.moradores.length > 0;
            const residentName = hasResident ? apto.moradores[0].nome : null;
            const isOccupied = apto.status === 'ocupado';

            return (
              <div key={apto.id} className="apt-card-dashboard">
                <div className="apt-card-header">
                  <span className="apt-number">Apto {apto.numero}</span>
                  <span className={`apt-badge ${isOccupied ? 'occupied' : 'vacant'}`}>
                    {isOccupied ? 'Ocupado' : 'Vazio'}
                  </span>
                </div>
                <div className="apt-card-body">
                  <User size={14} className={hasResident ? 'icon-active' : 'icon-muted'} />
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
                  {activity.type === 'taxa' ? (
                    <>
                      <img src={`https://ui-avatars.com/api/?name=${activity.title}&background=random`} alt="User" />
                      {activity.status === 'success' && (
                        <div className="status-badge success">
                          <CheckCircle2 size={12} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="icon-avatar warning">
                      <AlertCircle size={20} />
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
    </div>
  );
};

export default Dashboard;
