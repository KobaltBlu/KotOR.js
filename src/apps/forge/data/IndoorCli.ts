export enum IndoorGame {
  K1 = 'k1',
  K2 = 'k2',
}

export const parseGameArgument = (gameArg?: string | null): IndoorGame | null => {
  if (!gameArg) return null;
  const value = gameArg.toLowerCase().trim();
  if (value === 'k1' || value === 'kotor1' || value === 'kotor 1') {
    return IndoorGame.K1;
  }
  if (value === 'k2' || value === 'kotor2' || value === 'kotor 2' || value === 'tsl') {
    return IndoorGame.K2;
  }
  return null;
};

export const determineGameFromInstallation = async (_installationPath: string): Promise<IndoorGame | null> => {
  return null;
};
