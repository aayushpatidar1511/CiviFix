from pathlib import Path
import joblib
ROOT=Path(__file__).resolve().parents[1]
def predict(text):
 p=joblib.load(ROOT/'models/civic_classifier.joblib'); x=p['vectorizer'].transform([text]); probs=p['model'].predict_proba(x)[0]; i=probs.argmax(); return p['model'].classes_[i],float(probs[i])
