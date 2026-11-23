# Volley

Volleybaloefeningen uit filmpjes, in de volgorde van je training. Gemaakt voor Bart Claessens (23/11/2026).

Zo werkt het:

1. **Bewaren, op je gsm.** In Instagram, TikTok of YouTube tik je op Delen en kies je Volley.
2. **Kiezen, op je computer.** Op `kies.html` vink je de filmpjes aan en zet je ze in volgorde. Dan "Zet op mijn gsm".
3. **Afspelen, in de zaal.** Open Volley op je gsm. Eén filmpje per scherm, "Volgende" voor het volgende.

De filmpjes worden niet gedownload: ze spelen af van Instagram, TikTok of YouTube zelf. De app is alleen voor jou.

## Hoe het in elkaar zit

| Bestand | Wat |
|---|---|
| `index.html` | afspelen (de training) |
| `kies.html` | kiezen op de computer |
| `bewaar.html` | waar een gedeeld filmpje binnenkomt |
| `instellen.html` | een toestel koppelen met de koppellink, of `#demo` voor voorbeeldfilmpjes |
| `app.js`, `style.css` | gedeelde code en opmaak |
| `manifest.webmanifest`, `sw.js` | zodat de app op je startscherm en in het deelmenu van Android komt |
| `apps-script/` | het geheugen: een Apps Script met een Google-blad in Barts account |

Lokaal testen: `python -m http.server 8790` in deze map, dan `http://localhost:8790/instellen.html#demo`.
