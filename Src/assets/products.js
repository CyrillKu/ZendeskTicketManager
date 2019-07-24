async function getProductsFromJson() {
    var json = await fetch('products.json');
    var repsonse = await json.json();
    return repsonse.products;
}