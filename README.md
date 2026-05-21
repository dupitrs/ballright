# Eksāmenu treniņš — statiska vietne

Statiska viena lapas vietne 7 testu pildīšanai. Bez backend, bez datubāzes — der GitHub Pages.

## Saturs

- `index.html`, `style.css`, `app.js` — vietnes lapas
- `data/questions.js` — visi 7 testi un atbildes (ielādējas kā `window.QUIZ_DATA`)
- `data/questions.json` — tas pats JSON formātā (rezerves kopija)

## Pildīt lokāli

Atver `index.html` pārlūkā **vai** palaid mazu serveri:

```
python -m http.server 8000
```

Tad `http://localhost:8000/`.

## Publicēt uz GitHub Pages

1. Izveido GitHub repozitoriju (piem., `eksamenu-trenins`).
2. Iekopē šī `site/` mapes **saturu** repozitorija saknē (NE pašu `site/` mapi):
   - `index.html`
   - `style.css`
   - `app.js`
   - `data/`
3. Pushā uz `main` zaru.
4. Repo iestatījumos: **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save**.
5. Pēc minūtes vietne būs pieejama `https://<lietotājs>.github.io/<repo>/`.

## Bieži uzdotie jautājumi

**Vai citi cilvēki var pildīt, ja iedodu linku?**
Jā. Vietne ir pilnībā statiska — katrs apmeklētājs pilda neatkarīgi savā pārlūkprogrammā.

**Vai progress saglabājas, ja pārtrauc un atgriežas pēc 1h?**
Jā. Progress glabājas pārlūkprogrammas `localStorage` — saglabājas neierobežoti, kamēr lietotājs neattīra pārlūka datus. Atgriežoties uz vietnes (pat pēc dienām), testa karte rāda "Turpināt 12/64" un piedāvā izvēli **Turpināt** vai **Sākt no jauna**.

**Vai dažādi lietotāji redz vienus un tos pašus rezultātus?**
Nē. Katrs `localStorage` ir lokāls pārlūka konkrētajā ierīcē. Citi cilvēki / cita pārlūks / inkognito režīms = atsevišķs progress.

**Kur tiek glabāti rezultāti?**
Tikai pārlūkprogrammā. Nekāds dāta serveris nesaņem nekādu informāciju.

## Datu atjaunināšana

Ja kādu .doc failu papildina vai labo:

```
python parse_questions.py
```

(no projekta saknes — tas pārģenerē `site/data/questions.js` un `questions.json`).
