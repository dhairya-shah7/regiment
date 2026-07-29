"""
Temporal Sequence LSTM Autoencoder for Anomaly Detection.
Processes sliding window sequences (e.g., W=5 flow records per IP/entity)
to learn normal network transition patterns and compute sequence reconstruction loss.
"""
import joblib
import numpy as np
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


if TORCH_AVAILABLE:
    class LSTMAutoencoderNet(nn.Module):
        def __init__(self, input_dim: int, hidden_dim: int = 16, latent_dim: int = 8):
            super().__init__()
            self.input_dim = input_dim
            self.hidden_dim = hidden_dim
            self.latent_dim = latent_dim

            # Encoder
            self.encoder_lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True)
            self.encoder_fc = nn.Linear(hidden_dim, latent_dim)

            # Decoder
            self.decoder_fc = nn.Linear(latent_dim, hidden_dim)
            self.decoder_lstm = nn.LSTM(hidden_dim, input_dim, batch_first=True)

        def forward(self, x):
            # x shape: (batch_size, seq_len, input_dim)
            out, (h_n, c_n) = self.encoder_lstm(x)
            # Use last time step hidden state
            latent = torch.relu(self.encoder_fc(out[:, -1, :]))
            
            # Expand latent across sequence length
            seq_len = x.size(1)
            repeated = latent.unsqueeze(1).repeat(1, seq_len, 1)
            dec_in = torch.relu(self.decoder_fc(repeated))
            reconstructed, _ = self.decoder_lstm(dec_in)
            return reconstructed


class TemporalLSTMModel:
    def __init__(self, sequence_length: int = 5, hidden_dim: int = 16, epochs: int = 10, lr: float = 0.005):
        self.sequence_length = sequence_length
        self.hidden_dim = hidden_dim
        self.epochs = epochs
        self.lr = lr
        self.scaler = MinMaxScaler()
        self.feature_names = []
        self.is_trained = False
        self.net = None
        self.min_loss = 0.0
        self.max_loss = 1.0

    def create_sequences(self, X: np.ndarray) -> np.ndarray:
        """
        Convert tabular feature matrix X (N, num_features) into sliding window 
        sequence matrix (N, sequence_length, num_features) with padded start.
        """
        n_samples, n_features = X.shape
        seq_list = []
        for i in range(n_samples):
            if i < self.sequence_length - 1:
                # Pad early samples by duplicating initial frame
                pad_count = self.sequence_length - 1 - i
                pad = np.tile(X[0], (pad_count, 1))
                seq = np.vstack([pad, X[: i + 1]])
            else:
                seq = X[i - self.sequence_length + 1 : i + 1]
            seq_list.append(seq)
        return np.array(seq_list, dtype=np.float32)

    def fit(self, X: np.ndarray, feature_names: list = None):
        """Train sequence autoencoder on dataset features."""
        self.feature_names = feature_names or []
        X_scaled = self.scaler.fit_transform(X)
        sequences = self.create_sequences(X_scaled)
        n_samples, seq_len, n_features = sequences.shape

        if TORCH_AVAILABLE:
            self.net = LSTMAutoencoderNet(input_dim=n_features, hidden_dim=self.hidden_dim)
            optimizer = optim.Adam(self.net.parameters(), lr=self.lr)
            criterion = nn.MSELoss()

            tensor_seq = torch.from_numpy(sequences)
            self.net.train()
            for epoch in range(self.epochs):
                optimizer.zero_grad()
                reconstructed = self.net(tensor_seq)
                loss = criterion(reconstructed, tensor_seq)
                loss.backward()
                optimizer.step()

            self.net.eval()
            with torch.no_grad():
                rec = self.net(tensor_seq)
                mse_per_sample = torch.mean((rec - tensor_seq) ** 2, dim=(1, 2)).numpy()
        else:
            # Fallback polynomial variance reconstruction when torch is loading
            mean_seq = np.mean(sequences, axis=1, keepdims=True)
            mse_per_sample = np.mean((sequences - mean_seq) ** 2, axis=(1, 2))

        self.min_loss = float(np.min(mse_per_sample))
        self.max_loss = float(np.max(mse_per_sample))
        if self.max_loss == self.min_loss:
            self.max_loss = self.min_loss + 1e-6

        self.is_trained = True
        return self

    def score_samples(self, X: np.ndarray) -> np.ndarray:
        """
        Compute sequence reconstruction risk scores normalized in [0, 1].
        Higher score = higher temporal sequence anomaly.
        """
        if not self.is_trained:
            raise RuntimeError("Temporal LSTM model is not trained")

        X_scaled = self.scaler.transform(X)
        sequences = self.create_sequences(X_scaled)

        if TORCH_AVAILABLE and self.net is not None:
            self.net.eval()
            with torch.no_grad():
                tensor_seq = torch.from_numpy(sequences)
                rec = self.net(tensor_seq)
                mse_per_sample = torch.mean((rec - tensor_seq) ** 2, dim=(1, 2)).numpy()
        else:
            mean_seq = np.mean(sequences, axis=1, keepdims=True)
            mse_per_sample = np.mean((sequences - mean_seq) ** 2, axis=(1, 2))

        normalized = (mse_per_sample - self.min_loss) / (self.max_loss - self.min_loss)
        return np.clip(normalized, 0.0, 1.0)

    def predict(self, X: np.ndarray, threshold: float = 0.6) -> np.ndarray:
        """Return -1 for anomaly, 1 for normal."""
        scores = self.score_samples(X)
        return np.where(scores > threshold, -1, 1)

    def save(self, path: str):
        """Serialize model parameters and weights."""
        state_dict = self.net.state_dict() if (TORCH_AVAILABLE and self.net is not None) else None
        joblib.dump(
            {
                "scaler": self.scaler,
                "feature_names": self.feature_names,
                "sequence_length": self.sequence_length,
                "hidden_dim": self.hidden_dim,
                "min_loss": self.min_loss,
                "max_loss": self.max_loss,
                "is_trained": self.is_trained,
                "state_dict": state_dict,
                "input_dim": len(self.feature_names),
            },
            path,
        )

    def load(self, path: str):
        """Deserialize model from path."""
        data = joblib.load(path)
        self.scaler = data["scaler"]
        self.feature_names = data["feature_names"]
        self.sequence_length = data.get("sequence_length", 5)
        self.hidden_dim = data.get("hidden_dim", 16)
        self.min_loss = data.get("min_loss", 0.0)
        self.max_loss = data.get("max_loss", 1.0)
        self.is_trained = data.get("is_trained", False)

        input_dim = len(self.feature_names) if self.feature_names else 6
        if TORCH_AVAILABLE and data.get("state_dict") is not None:
            self.net = LSTMAutoencoderNet(input_dim=input_dim, hidden_dim=self.hidden_dim)
            self.net.load_state_dict(data["state_dict"])
            self.net.eval()
        return self
