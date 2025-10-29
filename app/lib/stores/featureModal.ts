import { atom } from 'nanostores';

export interface FeatureModalState {
  isOpen: boolean;
  currentFeatureIndex: number;
  totalFeatures: number;
}

export const featureModalStore = atom<FeatureModalState>({
  isOpen: false,
  currentFeatureIndex: 0,
  totalFeatures: 0,
});

export const openFeatureModal = (featureIndex: number, totalFeatures: number) => {
  featureModalStore.set({
    isOpen: true,
    currentFeatureIndex: featureIndex,
    totalFeatures,
  });
};

export const closeFeatureModal = () => {
  featureModalStore.set({
    isOpen: false,
    currentFeatureIndex: 0,
    totalFeatures: 0,
  });
};

export const setCurrentFeatureIndex = (index: number) => {
  const current = featureModalStore.get();
  if (index >= 0 && index < current.totalFeatures) {
    featureModalStore.set({
      ...current,
      currentFeatureIndex: index,
    });
  }
};

export const goToNextFeature = () => {
  const current = featureModalStore.get();
  const nextIndex = (current.currentFeatureIndex + 1) % current.totalFeatures;
  setCurrentFeatureIndex(nextIndex);
};

export const goToPreviousFeature = () => {
  const current = featureModalStore.get();
  const prevIndex = current.currentFeatureIndex === 0 ? current.totalFeatures - 1 : current.currentFeatureIndex - 1;
  setCurrentFeatureIndex(prevIndex);
};

// Helper function to open modal with a specific feature
export const openFeatureModalAtIndex = (featureIndex: number, totalFeatures: number) => {
  if (featureIndex >= 0 && featureIndex < totalFeatures) {
    openFeatureModal(featureIndex, totalFeatures);
  }
};
