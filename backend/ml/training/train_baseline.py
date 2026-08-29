from pathlib import Path
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib
ROOT=Path(__file__).resolve().parents[1]; df=pd.read_csv(ROOT/'datasets/civic_training.csv'); v=TfidfVectorizer(ngram_range=(1,2)); x=v.fit_transform(df.text); m=LogisticRegression(max_iter=1000).fit(x,df.category); joblib.dump({'vectorizer':v,'model':m},ROOT/'models/civic_classifier.joblib'); print('trained baseline model:',m.score(x,df.category))
