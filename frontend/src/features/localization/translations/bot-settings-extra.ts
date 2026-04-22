export const botSettingsExtraEn = {
    'botSettings.personality.defaultVoice': 'Alloy (Default)',
    'botSettings.import.unsupportedFile': 'Only CSV and JSON files are supported.',
    'botSettings.import.fileReadError': 'Failed to read the selected file.',
    'botSettings.import.jsonArrayRequired': 'JSON file must contain an array.',
    'botSettings.import.csvRowRequired': 'CSV file must have at least a header and one data row.',
    'botSettings.import.csvInvalidFormat': 'Invalid CSV format. Expected multiple columns, found: {{headers}}'
} as const;

export const botSettingsExtraPl: Record<keyof typeof botSettingsExtraEn, string> = {
    'botSettings.personality.defaultVoice': 'Alloy (domyślny)',
    'botSettings.import.unsupportedFile': 'Obsługiwane są tylko pliki CSV i JSON.',
    'botSettings.import.fileReadError': 'Nie udało się odczytać wybranego pliku.',
    'botSettings.import.jsonArrayRequired': 'Plik JSON musi zawierać tablicę.',
    'botSettings.import.csvRowRequired': 'Plik CSV musi zawierać nagłówek i co najmniej jeden wiersz danych.',
    'botSettings.import.csvInvalidFormat': 'Nieprawidłowy format CSV. Oczekiwano wielu kolumn, znaleziono: {{headers}}'
};
