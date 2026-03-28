export interface RealtimeModelOption {
  description: string;
  id: string;
  label: string;
}

export interface RealtimeVoiceOption {
  description: string;
  id: string;
  name: string;
}

export interface RealtimeProviderOption {
  defaultModel: string;
  defaultVoice: string;
  description: string;
  id: string;
  label: string;
  models: RealtimeModelOption[];
  voices: RealtimeVoiceOption[];
}

interface RealtimeSelection {
  model?: string;
  provider?: string;
  voice?: string;
}

const getSelect = (id: string): HTMLSelectElement | null => {
  return document.getElementById(id) as HTMLSelectElement | null;
};

const createOption = (value: string, label: string) => {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
};

const fillModels = (
  modelSelect: HTMLSelectElement,
  provider: RealtimeProviderOption,
  selectedModel?: string
) => {
  modelSelect.innerHTML = '';

  provider.models.forEach((item) => {
    modelSelect.appendChild(createOption(item.id, item.label));
  });

  const match = provider.models.find((item) => item.id === selectedModel);
  modelSelect.value = match?.id || provider.defaultModel;
};

const fillProviders = (
  providerSelect: HTMLSelectElement,
  providers: RealtimeProviderOption[],
  selectedProvider?: string
) => {
  providerSelect.innerHTML = '';

  providers.forEach((item) => {
    providerSelect.appendChild(createOption(item.id, item.label));
  });

  providerSelect.value = selectedProvider || providers[0]?.id || '';
};

const fillVoices = (
  voiceSelect: HTMLSelectElement,
  provider: RealtimeProviderOption,
  selectedVoice?: string
) => {
  voiceSelect.innerHTML = '';

  provider.voices.forEach((item) => {
    const label = `${item.name} - ${item.description}`;
    voiceSelect.appendChild(createOption(item.id, label));
  });

  const match = provider.voices.find((item) => item.id === selectedVoice);
  voiceSelect.value = match?.id || provider.defaultVoice;
};

const resolveProvider = (
  providers: RealtimeProviderOption[],
  providerId?: string
) => {
  return providers.find((item) => item.id === providerId) || providers[0] || null;
};

export const syncRealtimeSettingsForm = (
  providers: RealtimeProviderOption[],
  selection: RealtimeSelection = {}
) => {
  const providerSelect = getSelect('provider');
  const modelSelect = getSelect('model');
  const voiceSelect = getSelect('voice');

  if (!providerSelect || !modelSelect || !voiceSelect || providers.length === 0) {
    return null;
  }

  const provider = resolveProvider(providers, selection.provider);
  if (!provider) {
    return null;
  }

  fillProviders(providerSelect, providers, provider.id);
  fillModels(modelSelect, provider, selection.model);
  fillVoices(voiceSelect, provider, selection.voice);

  return {
    provider: providerSelect.value,
    model: modelSelect.value,
    voice: voiceSelect.value
  };
};

export const bindRealtimeSettingsForm = (
  getProviders: () => RealtimeProviderOption[]
) => {
  const providerSelect = getSelect('provider');
  if (!providerSelect) {
    return;
  }

  providerSelect.addEventListener('change', () => {
    syncRealtimeSettingsForm(getProviders(), {
      provider: providerSelect.value
    });
  });
};
