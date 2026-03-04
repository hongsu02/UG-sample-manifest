fetch('https://psomagen.com/').then(r => r.text()).then(html => {
    const match = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*logo[^>]*>/i);
    if (match) console.log(match[1]);
    else {
        const match2 = html.match(/<img[^>]+src=["']([^"']+logo[^"']+)["'][^>]*>/i);
        if (match2) console.log(match2[1]);
    }
});
