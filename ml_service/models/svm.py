"""One-Class SVM model wrapper (secondary/optional model)."""
import joblib
import numpy as np
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import MinMaxScaler


class OneClassSVMModel:
    def __init__(self, nu: float = 0.1, kernel: str = "rbf", gamma: str = "auto"):
        self.nu = nu
        self.kernel = kernel
        self.gamma = gamma
        self.model: OneClassSVM = None
        self.scaler: MinMaxScaler = None
        self.feature_names: list = []
        self.is_trained: bool = False
        self.contamination = nu  # alias for compatibility

    def fit(self, X: np.ndarray, feature_names: list = None):
        """Train the One-Class SVM. Note: slower than IsolationForest on large data."""
        self.feature_names = feature_names or []
        self.scaler = MinMaxScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = OneClassSVM(
            nu=self.nu,
            kernel=self.kernel,
            gamma=self.gamma,
        )
        self.model.fit(X_scaled)
        self.is_trained = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return -1 for anomaly, 1 for normal."""
        if not self.is_trained:
            raise RuntimeError("Model has not been trained yet")
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

    def score_samples(self, X: np.ndarray) -> np.ndarray:
        """Return normalized anomaly scores in [0, 1]."""
        if not self.is_trained:
            raise RuntimeError("Model has not been trained yet")
        X_scaled = self.scaler.transform(X)
        raw_scores = self.model.decision_function(X_scaled)
        flipped = -raw_scores
        score_min, score_max = flipped.min(), flipped.max()
        if score_max == score_min:
            return np.zeros(len(flipped))
        return (flipped - score_min) / (score_max - score_min)

    def classify(self, score: float) -> str:
        if score > 0.7:
            return "critical"
        elif score > 0.4:
            return "suspicious"
        return "normal"

    def save(self, path: str):
        joblib.dump(
            {
                "model": self.model,
                "scaler": self.scaler,
                "feature_names": self.feature_names,
                "nu": self.nu,
                "is_trained": self.is_trained,
            },
            path,
        )

    def load(self, path: str):
        data = joblib.load(path)
        self.model = data["model"]
        self.scaler = data["scaler"]
        self.feature_names = data["feature_names"]
        self.nu = data["nu"]
        self.contamination = self.nu
        self.is_trained = data["is_trained"]
        return self
