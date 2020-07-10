exports.sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}; // sleep()

exports.roundMCap = (v) => {
    if (!v) return '$0';

    const BILLION = 1000000000;
    const MILLION = 1000000;

    if (v >= BILLION) {
        return `$${(v / BILLION).toFixed(2)}B`;
    } else if (v >= MILLION) {
        return `$${(v / MILLION).toFixed(1)}M`;
    } else {
        return `$${Math.floor(v / 1000)},${(v % 1000).toFixed(0)}`;
    }
}; // roundMCap()

exports.stripHTML = (str) => {
    if (typeof str !== String) return str;
    return str.replace(/<[^>]*>?/gm, '');
}; // stripHTML()
