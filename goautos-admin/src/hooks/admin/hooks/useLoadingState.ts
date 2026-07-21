
export const useLoadingState = (loadingStates: boolean[]) => {
  return loadingStates.some(isLoading => isLoading);
};
