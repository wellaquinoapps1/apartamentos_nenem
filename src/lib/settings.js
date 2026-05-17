const DEFAULT_SETTINGS = {
  nomeResidencial: 'Residencial Vista',
  nomeAdmin: 'Admin',
  corAvatar: '0D8ABC', // Default teal blue color code without hex hash
  emailContato: 'suporte@wellaquinoapps.com',
  telefoneSuporte: '(11) 99999-9999'
};

export const getSettings = () => {
  try {
    const saved = localStorage.getItem('apartamentos_nenem_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Erro ao ler configurações:', e);
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (newSettings) => {
  try {
    localStorage.setItem('apartamentos_nenem_settings', JSON.stringify(newSettings));
    // Dispatch a custom event to notify all components to re-render in real time!
    window.dispatchEvent(new Event('settingsUpdated'));
    return true;
  } catch (e) {
    console.error('Erro ao salvar configurações:', e);
    return false;
  }
};
