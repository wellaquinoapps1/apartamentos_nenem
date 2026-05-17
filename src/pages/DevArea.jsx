import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSettings, saveSettings } from '../lib/settings';
import {
  Settings,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Building,
  User,
  Activity,
  HardDrive,
  Users
} from 'lucide-react';
import './DevArea.css';

const DevArea = () => {
  const [settings, setSettings] = useState(getSettings());
  const [dbStats, setDbStats] = useState({ aptos: 0, moradores: 0, taxas: 0, loading: true });
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [message, setMessage] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Admin Management States
  const [adminsList, setAdminsList] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminForm, setAdminForm] = useState({ nome: '', email: '', senha: '', role: 'admin' });

  // Available avatar colors
  const colorOptions = [
    { name: 'Teal Blue', hex: '0D8ABC', label: 'Teal' },
    { name: 'Primary Blue', hex: '2563eb', label: 'Azul' },
    { name: 'Emerald Green', hex: '10b981', label: 'Verde' },
    { name: 'Vibrant Orange', hex: 'f97316', label: 'Laranja' },
    { name: 'Deep Purple', hex: '8b5cf6', label: 'Roxo' },
    { name: 'Rose Pink', hex: 'f43f5e', label: 'Rosa' }
  ];

  useEffect(() => {
    fetchStats();
    checkConnection();
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setAdminsLoading(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setAdminsList(data || []);
    } catch (e) {
      console.error('Erro ao buscar admins:', e);
      showToast('Erro ao carregar lista de administradores.', 'error');
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleAdminFormChange = (field, val) => {
    setAdminForm(prev => ({ ...prev, [field]: val }));
  };

  const handleOpenAdminModal = (admin = null) => {
    if (admin) {
      setSelectedAdmin(admin);
      setAdminForm({ nome: admin.nome, email: admin.email, senha: admin.senha, role: admin.role });
    } else {
      setSelectedAdmin(null);
      setAdminForm({ nome: '', email: '', senha: '', role: 'admin' });
    }
    setShowAdminModal(true);
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    try {
      if (selectedAdmin) {
        const { error } = await supabase
          .from('admins')
          .update({
            nome: adminForm.nome,
            email: adminForm.email,
            senha: adminForm.senha,
            role: adminForm.role
          })
          .eq('id', selectedAdmin.id);

        if (error) throw error;
        showToast('Administrador atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('admins')
          .insert([
            {
              nome: adminForm.nome,
              email: adminForm.email,
              senha: adminForm.senha,
              role: adminForm.role
            }
          ]);

        if (error) throw error;
        showToast('Administrador adicionado com sucesso!', 'success');
      }
      setShowAdminModal(false);
      fetchAdmins();
    } catch (err) {
      console.error(err);
      showToast(`Erro ao salvar: ${err.message}`, 'error');
    }
  };

  const handleDeleteAdmin = async (id, email) => {
    if (email === 'welldeveloper@dev.com') {
      showToast('O desenvolvedor mestre não pode ser excluído!', 'error');
      return;
    }
    const confirm = window.confirm(`Remover acesso de ${email}?`);
    if (!confirm) return;

    try {
      const { error } = await supabase.from('admins').delete().eq('id', id);
      if (error) throw error;
      showToast('Acesso removido com sucesso!', 'success');
      fetchAdmins();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover acesso.', 'error');
    }
  };

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.from('apartamentos').select('id').limit(1);
      if (error) throw error;
      setConnectionStatus('connected');
    } catch (e) {
      console.error(e);
      setConnectionStatus('failed');
    }
  };

  const fetchStats = async () => {
    try {
      setDbStats(prev => ({ ...prev, loading: true }));
      const { count: countAptos } = await supabase.from('apartamentos').select('*', { count: 'exact', head: true });
      const { count: countMoradores } = await supabase.from('moradores').select('*', { count: 'exact', head: true });
      const { count: countTaxas } = await supabase.from('taxas').select('*', { count: 'exact', head: true });
      
      setDbStats({
        aptos: countAptos || 0,
        moradores: countMoradores || 0,
        taxas: countTaxas || 0,
        loading: false
      });
    } catch (e) {
      console.error('Erro ao buscar estatísticas:', e);
      setDbStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleInputChange = (field, val) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const success = saveSettings(settings);
    if (success) {
      showToast('Configurações salvas com sucesso!', 'success');
    } else {
      showToast('Erro ao salvar as configurações.', 'error');
    }
  };

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Seed realistic test data
  const handleSeedData = async () => {
    if (isSeeding) return;
    const confirm = window.confirm("Deseja semear dados de teste? Isso vai cadastrar moradores fictícios e associá-los aos apartamentos com valores e status financeiros preenchidos.");
    if (!confirm) return;

    try {
      setIsSeeding(true);
      showToast('Semeando dados no Supabase...', 'info');

      // 1. Fetch apartments
      const { data: aptos, error: errAptos } = await supabase.from('apartamentos').select('*');
      if (errAptos) throw errAptos;

      if (!aptos || aptos.length === 0) {
        throw new Error("Nenhum apartamento encontrado na tabela para associar.");
      }

      // 2. Clear existing residents
      await supabase.from('moradores').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Realistic resident names and photos
      // Realistic resident names and photos
      const mockResidents = [
        { nome: 'Julio Cesar', cpf: '123.456.789-00', telefone: '(11) 98765-4321', email: 'julio@email.com', local_trabalho: 'Advocacia Lima', dia_pagamento: 5 },
        { nome: 'Sarinha De Oliveira Santos', cpf: '987.654.321-11', telefone: '(11) 91234-5678', email: 'sarinha@email.com', local_trabalho: 'Autônoma', dia_pagamento: 10 },
        { nome: 'Carlos Eduardo', cpf: '456.789.123-22', telefone: '(11) 97777-8888', email: 'carlos@email.com', local_trabalho: 'SoftTech Corp', dia_pagamento: 15 },
        { nome: 'Beatriz Costa', cpf: '789.123.456-33', telefone: '(11) 96666-5555', email: 'beatriz@email.com', local_trabalho: 'Estudante', dia_pagamento: 20 }
      ];

      // Some base64 sample avatars to make it gorgeous
      const base64Avatars = [
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='50' fill='%23ff9a9e'/><text x='50' y='55' font-size='35' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>JC</text></svg>",
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='50' fill='%23a1c4fd'/><text x='50' y='55' font-size='35' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>SO</text></svg>",
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='50' fill='%23fbc2eb'/><text x='50' y='55' font-size='35' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>CE</text></svg>",
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='50' fill='%23d4fc79'/><text x='50' y='55' font-size='35' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>BC</text></svg>"
      ];

      // Reset all apartments to vacant first
      for (let apto of aptos) {
        await supabase.from('apartamentos').update({
          status: 'vazio',
          qtd_pessoas: 0,
          data_entrada: null,
          data_saida: null
        }).eq('id', apto.id);
      }

      // 3. Insert and link residents to first few apartments
      for (let i = 0; i < Math.min(mockResidents.length, aptos.length); i++) {
        const apto = aptos[i];
        const res = mockResidents[i];
        
        // Update apartment details
        const rentValue = i === 0 ? 1250.00 : i === 1 ? 950.00 : i === 2 ? 1100.00 : 850.00;
        const { error: errAptoUpdate } = await supabase.from('apartamentos').update({
          status: 'ocupado',
          qtd_pessoas: i === 1 ? 2 : 1, // Sarinha has 2 people
          valor_aluguel: rentValue,
          data_entrada: '2026-05-16',
          data_saida: null
        }).eq('id', apto.id);

        if (errAptoUpdate) throw errAptoUpdate;

        // Create resident linked to this apartment
        const { error: errRes } = await supabase.from('moradores').insert({
          nome: res.nome,
          cpf: res.cpf,
          telefone: res.telefone,
          email: res.email,
          apartamento_id: apto.id,
          foto_url: base64Avatars[i],
          local_trabalho: res.local_trabalho,
          dia_pagamento: res.dia_pagamento
        });

        if (errRes) throw errRes;

        // 4. Create financial invoices (one paid, one pending for demo)
        await supabase.from('taxas').insert([
          {
            apartamento_id: apto.id,
            descricao: 'Mensalidade de Aluguel - Maio',
            valor: rentValue,
            vencimento: '2026-05-10',
            status: i % 2 === 0 ? 'pago' : 'pendente' // Alternating paid and pending
          }
        ]);
      }

      showToast('Dados de teste gerados com sucesso!', 'success');
      fetchStats();
    } catch (e) {
      console.error(e);
      showToast(`Erro ao semear dados: ${e.message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Reset database (vacate all apartments and delete all residents)
  const handleResetDatabase = async () => {
    if (isResetting) return;
    const confirm = window.confirm("ATENÇÃO: Isso vai excluir todos os moradores, deletar todos os registros financeiros e desocupar todos os apartamentos! Deseja continuar?");
    if (!confirm) return;

    try {
      setIsResetting(true);
      showToast('Limpando moradores e desocupando unidades...', 'info');

      // 1. Delete all residents
      const { error: errRes } = await supabase.from('moradores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (errRes) throw errRes;

      // 2. Delete all financial transactions
      const { error: errTaxas } = await supabase.from('taxas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (errTaxas) throw errTaxas;

      // 3. Reset apartments status
      const { data: aptos, error: errAptos } = await supabase.from('apartamentos').select('id');
      if (errAptos) throw errAptos;

      for (let apto of aptos) {
        await supabase.from('apartamentos').update({
          status: 'vazio',
          qtd_pessoas: 0,
          data_entrada: null,
          data_saida: null
        }).eq('id', apto.id);
      }

      showToast('Banco de dados limpo com sucesso!', 'success');
      fetchStats();
    } catch (e) {
      console.error(e);
      showToast(`Erro ao resetar: ${e.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="dev-area-page">
      <div className="dev-header">
        <div className="dev-title-container">
          <Settings className="dev-title-icon" />
          <div>
            <h1>Área do Desenvolvedor</h1>
            <p>Configurações globais e gerenciamento de banco de dados do sistema.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`dev-alert ${message.type}`}>
          <AlertTriangle size={18} />
          <span>{message.text}</span>
        </div>
      )}

      <div className="dev-grid">
        {/* Settings Form */}
        <div className="dev-card glass">
          <div className="dev-card-header">
            <Activity className="card-icon" />
            <h2>Informações do Administrador & Sistema</h2>
          </div>
          
          <form onSubmit={handleSaveSettings} className="dev-form">
            <div className="form-group">
              <label htmlFor="nomeResidencial">
                <Building size={16} />
                Nome do Residencial
              </label>
              <input
                type="text"
                id="nomeResidencial"
                value={settings.nomeResidencial}
                onChange={(e) => handleInputChange('nomeResidencial', e.target.value)}
                placeholder="Ex: Residencial Vista"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="nomeAdmin">
                <User size={16} />
                Nome do Administrador
              </label>
              <input
                type="text"
                id="nomeAdmin"
                value={settings.nomeAdmin}
                onChange={(e) => handleInputChange('nomeAdmin', e.target.value)}
                placeholder="Ex: Admin"
                required
              />
            </div>

            <div className="form-group">
              <label>Cor do Perfil (Iniciais)</label>
              <div className="color-selector">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.hex}
                    type="button"
                    className={`color-bubble ${settings.corAvatar === opt.hex ? 'active' : ''}`}
                    style={{ backgroundColor: `#${opt.hex}` }}
                    onClick={() => handleInputChange('corAvatar', opt.hex)}
                    title={opt.name}
                  >
                    {settings.corAvatar === opt.hex && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="emailContato">
                  <Mail size={16} />
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  id="emailContato"
                  value={settings.emailContato}
                  onChange={(e) => handleInputChange('emailContato', e.target.value)}
                  placeholder="Ex: admin@email.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefoneSuporte">
                  <Phone size={16} />
                  Telefone Suporte
                </label>
                <input
                  type="text"
                  id="telefoneSuporte"
                  value={settings.telefoneSuporte}
                  onChange={(e) => handleInputChange('telefoneSuporte', e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
            </div>

            <button type="submit" className="btn-save-settings">
              Salvar Alterações
            </button>
          </form>
        </div>

        {/* Database & Supabase Tools */}
        <div className="dev-card glass">
          <div className="dev-card-header">
            <Database className="card-icon" />
            <h2>Conectividade & Banco de Dados</h2>
          </div>

          <div className="connection-card">
            <div className="connection-status-row">
              <span>Status da Conexão:</span>
              <div className={`status-indicator ${connectionStatus}`}>
                <span className="dot" />
                <span>
                  {connectionStatus === 'checking' && 'Verificando...'}
                  {connectionStatus === 'connected' && 'Supabase Conectado'}
                  {connectionStatus === 'failed' && 'Erro de Conexão'}
                </span>
              </div>
            </div>
            <p className="connection-info">
              As credenciais de acesso localizadas no arquivo <strong>.env</strong> estão conectadas e seguras.
            </p>
          </div>

          <div className="stats-box">
            <h3>Estatísticas do Banco</h3>
            {dbStats.loading ? (
              <div className="stats-loading">Carregando contagem...</div>
            ) : (
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-val">{dbStats.aptos}</span>
                  <span className="stat-lbl">Apartamentos</span>
                </div>
                <div className="stat-item">
                  <span className="stat-val">{dbStats.moradores}</span>
                  <span className="stat-lbl">Moradores</span>
                </div>
                <div className="stat-item">
                  <span className="stat-val">{dbStats.taxas}</span>
                  <span className="stat-lbl">Mensalidades</span>
                </div>
              </div>
            )}
          </div>

          <div className="dev-actions">
            <h3>Ações de Desenvolvedor</h3>
            <div className="action-buttons-group">
              <button 
                type="button" 
                className="btn-dev-action seed" 
                onClick={handleSeedData}
                disabled={isSeeding || connectionStatus !== 'connected'}
              >
                <RefreshCw className={isSeeding ? 'spin' : ''} size={18} />
                <span>Gerar Dados de Teste</span>
              </button>

              <button 
                type="button" 
                className="btn-dev-action reset" 
                onClick={handleResetDatabase}
                disabled={isResetting || connectionStatus !== 'connected'}
              >
                <Trash2 size={18} />
                <span>Limpar Banco de Dados</span>
              </button>
            </div>
            <div className="action-warning">
              <AlertTriangle size={14} fill="rgba(245, 158, 11, 0.2)" />
              <span>Aviso: A limpeza apagará dados permanentemente! Use com cautela.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Administradores / Acessos Management */}
      <div className="dev-card glass full-width" style={{ marginTop: '24px' }}>
        <div className="dev-card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users className="card-icon" />
            <h2>Gestão de Administradores & Acessos</h2>
          </div>
          <button 
            type="button" 
            className="btn-save-settings" 
            style={{ margin: 0, padding: '8px 16px', fontSize: '0.8rem' }}
            onClick={() => handleOpenAdminModal()}
          >
            Adicionar Administrador
          </button>
        </div>

        <div className="admins-table-container" style={{ overflowX: 'auto' }}>
          {adminsLoading ? (
            <div className="stats-loading">Carregando lista...</div>
          ) : (
            <table className="admins-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nome</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>E-mail</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Senha</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {adminsList.map((adm) => (
                  <tr key={adm.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 8px', fontSize: '0.85rem', fontWeight: 600 }}>{adm.nome}</td>
                    <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{adm.email}</td>
                    <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}><code>{adm.senha}</code></td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className={`status-indicator ${adm.role === 'dev' ? 'checking' : 'connected'}`} style={{ display: 'inline-flex', padding: '2px 8px', fontSize: '0.7rem' }}>
                        {adm.role === 'dev' ? 'Desenvolvedor' : 'Administrador'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--primary)', fontWeight: 600, marginRight: '8px', cursor: 'pointer' }}
                        onClick={() => handleOpenAdminModal(adm)}
                      >
                        Editar
                      </button>
                      {adm.email !== 'welldeveloper@dev.com' && (
                        <button 
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => handleDeleteAdmin(adm.id, adm.email)}
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal para Adicionar/Editar Admin */}
      {showAdminModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal glass">
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700 }}>
              {selectedAdmin ? 'Editar Administrador' : 'Adicionar Administrador'}
            </h3>
            <form onSubmit={handleSaveAdmin} className="dev-form">
              <div className="form-group">
                <label htmlFor="modal-nome">Nome</label>
                <input
                  type="text"
                  id="modal-nome"
                  value={adminForm.nome}
                  onChange={(e) => handleAdminFormChange('nome', e.target.value)}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-email">E-mail</label>
                <input
                  type="email"
                  id="modal-email"
                  value={adminForm.email}
                  disabled={selectedAdmin?.email === 'welldeveloper@dev.com'}
                  onChange={(e) => handleAdminFormChange('email', e.target.value)}
                  placeholder="Ex: joao@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-senha">Senha</label>
                <input
                  type="text"
                  id="modal-senha"
                  value={adminForm.senha}
                  onChange={(e) => handleAdminFormChange('senha', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-role">Tipo de Acesso</label>
                <select
                  id="modal-role"
                  value={adminForm.role}
                  disabled={selectedAdmin?.email === 'welldeveloper@dev.com'}
                  onChange={(e) => handleAdminFormChange('role', e.target.value)}
                  className="form-group input"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--background)',
                    outline: 'none'
                  }}
                >
                  <option value="admin">Administrador</option>
                  <option value="dev">Desenvolvedor (Dev)</option>
                </select>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-dev-action seed"
                  style={{ padding: '8px 16px', flex: 'none' }}
                  onClick={() => setShowAdminModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-save-settings"
                  style={{ padding: '8px 16px', margin: 0 }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevArea;
