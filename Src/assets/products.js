// async function (){
//     var response = await fetch('products.xml');
// }
function getXML() {
    var promise = fetch('products.xml').then(function (data) {
        console.log(data);

    });
}