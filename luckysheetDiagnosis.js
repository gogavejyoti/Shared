// Register ONLY pasted formulas
for (let i = 0; i < pastedFormulaCells.length; i++) {
    const [r, c, f] = pastedFormulaCells[i];
    Ucv(sheet, r, c, f, false);
}

// Calculate ONLY affected chain
const chain = sheet.calcChain || [];
for (let i = 0; i < chain.length; i++) {
    const node = chain[i];
    if (node && node.func) {
        Ucv(sheet, node.r, node.c, node.func[2], true);
    }
}
