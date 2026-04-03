"""Isolation Forest model wrapper."""
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler
from pathlib import Path


class IsolationForestModel:
    def __init__(self, contamination: float = 0.1, n_estimators: int = 100, random_state: int = 42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model: IsolationForest = None
        self.scaler: MinMaxScaler = None
        self.feature_names: list = []
        self.is_trained: bool = False

    def fit(self, X: np.ndarray, feature_names: list = None):
        """Train the Isolation Forest on feature matrix X."""
        self.feature_names = feature_names or []
        self.scaler = MinMaxScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1,
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
        """
        Return normalized anomaly scores in [0, 1].
        Higher score = more anomalous.
        """
        if not self.is_trained:
            raise RuntimeError("Model has not been trained yet")
        X_scaled = self.scaler.transform(X)
        # decision_function returns negative scores; more negative = more anomalous
        raw_scores = self.model.decision_function(X_scaled)
        # Flip and normalize to [0, 1]
        flipped = -raw_scores
        score_min, score_max = flipped.min(), flipped.max()
        if score_max == score_min:
            return np.zeros(len(flipped))
        normalized = (flipped - score_min) / (score_max - score_min)
        return normalized

    def classify(self, score: float) -> str:
        """Classify a risk score into label."""
        if score > 0.7:
            return "critical"
        elif score > 0.4:
            return "suspicious"
        return "normal"

    def save(self, path: str):
        """Serialize model + scaler to disk."""
        joblib.dump(
            {
                "model": self.model,
                "scaler": self.scaler,
                "feature_names": self.feature_names,
                "contamination": self.contamination,
                "is_trained": self.is_trained,
            },
            path,
        )

    def load(self, path: str):
        """Deserialize model from disk."""
        data = joblib.load(path)
        self.model = data["model"]
        self.scaler = data["scaler"]
        self.feature_names = data["feature_names"]
        self.contamination = data["contamination"]
        self.is_trained = data["is_trained"]
        return self
