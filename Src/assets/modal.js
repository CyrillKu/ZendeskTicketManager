async function launchLinkedModal() {
    var modalContext = await client.invoke('instances.create', {
        location: 'modal',
        url: 'assets/modalLinked.html',
        size: { // optional
            width: '450px',
            height: '300px'
        }
    });

    // The modal is on screen now
    var modalClient = client.instance(modalContext['instances.create'][0].instanceGuid);
    await modalClient.on('modal.close', function () {
        res = true;
    });
    return res;
}