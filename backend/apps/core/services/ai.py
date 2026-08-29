from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from .logic import score_priority
class AIClassificationService:
    labels=['POTHOLE','STREETLIGHT','WATER','DRAINAGE','GARBAGE','ROAD','ELECTRICITY','OTHER']
    examples=[('deep pothole road crater','POTHOLE'),('broken road asphalt hole','POTHOLE'),('street lamp not working dark pole','STREETLIGHT'),('lamp outage at night','STREETLIGHT'),('water pipe leaking burst supply','WATER'),('water leakage pipeline','WATER'),('drain overflow blocked drainage','DRAINAGE'),('flooded drain after rain','DRAINAGE'),('garbage trash waste collection missed','GARBAGE'),('road surface damaged traffic','ROAD'),('electric power pole cable fault','ELECTRICITY'),('public civic issue','OTHER')]
    def __init__(self):
        self.vectorizer=TfidfVectorizer(ngram_range=(1,2),min_df=1); x=self.vectorizer.fit_transform([a for a,_ in self.examples]); self.model=LogisticRegression(max_iter=500).fit(x,[b for _,b in self.examples])
    def predict(self,title,description):
        x=self.vectorizer.transform([f'{title} {description}']); probs=self.model.predict_proba(x)[0]; idx=probs.argmax(); return self.model.classes_[idx],float(probs[idx])
