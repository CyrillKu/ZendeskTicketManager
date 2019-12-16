async function updateFollowUps() {
    var currentTicketId = await getValueFromAPI('ticket.id');
    var linkedData = await getValueFromField(RmApp.settings.linkedDataFieldId);
    if (linkedData) {
        var linkedTicket = await getLinkedTicketData(linkedData.substring(linkedData.indexOf(":") + 1,
            linkedData.length));
        if (linkedTicket) {
            if (linkedTicket.status == 'closed') {
                var followUpId = linkedTicket.followup_ids[linkedTicket.followup_ids
                    .length - 1];
                if (followUpId) {
                    var url = RmApp.settings.serverUrl + 'api/v2/tickets/' + currentTicketId + '.json';
                    var sourceQuery = {
                        ticket: {
                            custom_fields: [{
                                id: RmApp.settings.linkedDataFieldId,
                                value: linkedData.substring(0, linkedData.indexOf(":") + 1) +
                                    followUpId
                            }]
                        }
                    }
                    var query = JSON.stringify(sourceQuery);
                    var fetch = makeFetchBody(url, 'PUT', query, null);
                    await client.request(fetch);
                }
            }

        }
    }
}

async function deleteLinkedData() {
    var currentTicket = await getValueFromAPI('ticket');
    var url = RmApp.settings.serverUrl + 'api/v2/tickets/' +
        currentTicket.id + '.json';
    var source = {
        ticket: {
            custom_fields: [{
                id: RmApp.settings.linkedDataFieldId,
                value: ""
            }]
        }
    }
    var query = JSON.stringify(source);
    var fetch = makeFetchBody(url, 'PUT', query, null);
    await client.request(fetch);
}

function addWarning(category, row, label = null) {
    var container = document.querySelector('span[data-' + category + ']');
    var div = document.querySelector('div[data-container' + row + ']');
    if (label) {
        var span = document.createElement('span');
        span.classList.add('ck_label');
        if (label.includes("Standard") || label.includes("Low") || label.includes("Normal")) {
            span.classList.add('good');
        } else if (label.includes("High") || label.includes("Extended")) {
            span.classList.add('warning');
        } else if (label.includes("Critical") || label.includes("Premier") || label.includes("Major") || label.includes("Urgent")) {
            span.classList.add('bad');
        }
        span.innerHTML = label;
        container.appendChild(span);
    }
    container.classList.remove('hidden');
    div.classList.remove('hidden');
}


async function showWarnings() {
    var tags = await getValueFromAPI('ticket.tags');
    var priority = await getValueFromAPI('ticket.priority');
    var isAdded = false;
    if (tags.indexOf("premium_solution_support") > -1) {
        addWarning("ps", 1);
        isAdded = true;
    };
    tags.forEach(tag => {
        if (tag.indexOf('smua') > -1) {
            addWarning("smua", 1, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
            isAdded = true;
        }
        if (tag.indexOf('severity') > -1) {
            addWarning("severity", 2, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
            isAdded = true;
        }
    });
    if (priority && priority != '-') {
        addWarning("priority", 2, capitalize(priority))
        isAdded = true;
    }
    return isAdded;
}

async function getValueFromField(fieldId, parentClient = null) {
    if (parentClient) client = parentClient;
    var fieldData = await client.get('ticket.customField:custom_field_' + fieldId);
    var value = fieldData['ticket.customField:custom_field_' + fieldId];
    return value;
}

async function getValueFromAPI(method) {
    var data = await client.get(method);
    var value = data[method];
    return value;
}

function getNumberFromUrl(link) {
    return link.href.substring(link.href.lastIndexOf('/') + 1, link.href.length)
}

async function getAppClients(client) {
    var instances = (await client.get('instances')).instances;
    var parentClient = null;
    var modalClient = null;
    for (var instanceGuid in instances) {
        if (instances[instanceGuid].location === 'ticket_sidebar') {
            parentClient = client.instance(instanceGuid);
        }
        if (instances[instanceGuid].location === 'modal') {
            modalClient = client.instance(instanceGuid);
        }
    }
    return {
        modalClient: modalClient,
        parentClient: parentClient
    }

}

async function createNewReclamation() {
    var tags = await getValueFromAPI('ticket.tags');
    var requestNumber = await getValueFromAPI('ticket.id');
    if (tags.indexOf('abbyy_3a') >= 0) window.open(
        'https://reclamationmanager.abbyy.com/NewReclamation.aspx?description=%5burl%3dhttps%3a%2f%2fabbyy.zendesk.com%2fagent%2ftickets%2f' +
        requestNumber + '%5dZendesk+request+%23' + requestNumber +
        '%5b%2furl%5d&tags=helpdesk,abbyy_3a'
    );
    else window.open(
        'https://reclamationmanager.abbyy.com/NewReclamation.aspx?description=%5burl%3dhttps%3a%2f%2fabbyy.zendesk.com%2fagent%2ftickets%2f' +
        requestNumber + '%5dZendesk+request+%23' + requestNumber +
        '%5b%2furl%5d&tags=helpdesk'
    );
}

async function removeElementFromList(element) {
    if (element.parentNode.parentNode.id == 'rmList') {
        var current = await getValueFromField(RmApp.settings.reclamationsFieldId);
        var reclamationNumber = getNumberFromUrl(element.previousSibling);
        var updatedRM = current.replace(reclamationNumber + ',', '');
        removeTag('rm' + reclamationNumber);
        client.set('ticket.customField:custom_field_' + RmApp.settings.reclamationsFieldId,
            updatedRM);
        element.parentNode.remove();
        if (updatedRM == '') removeTag('reclamation');
    } else if (element.parentNode.parentNode.id == 'ftList') {
        var current = await getValueFromField(RmApp.settings.featuresFieldId);
        var taskNumber = getNumberFromUrl(element.previousSibling);
        var updatedFT = current.replace(taskNumber + ',', '');
        removeTag('tfs' + taskNumber);
        client.set('ticket.customField:custom_field_' + RmApp.settings.featuresFieldId,
            updatedFT);
        element.parentNode.remove();
        if (updatedFT == '') removeTag('tfs');
    }
    resizeWindow(-RmApp.rmHeight)
}

function openAboutPage() {
    window.open('https://wiki.abbyy.com/display/SP/Integration+with+Reclamation+Manager');
}

async function launchLinkedModal() {
    await client.invoke('instances.create', {
        location: 'modal',
        url: 'assets/modalLinked.html'
    });
}

function addTag(value) {
    client.invoke('ticket.tags.add', value);
}
// удалить тег
function removeTag(value) {
    client.invoke('ticket.tags.remove', value);
}

async function getLinkedTicketData(linkedTicketId) {
    if (linkedTicketId) {
        var url = RmApp.settings.serverUrl + 'api/v2/tickets/' + linkedTicketId + '.json';
        var fetchSelf = makeFetchBody(url, 'GET', '', null);
        try {
            var response = await client.request(fetchSelf);
        } catch (error) {
            if (error.status == 404) return undefined;
        } finally {
            if (response) return response.ticket;
        }
    } else return undefined;
}

function openTicket(link) {
    client.invoke('routeTo', 'ticket', link.innerHTML);
}
// собрать тело http-запроса
function makeFetchBody(url, type, query, auth) {
    if (auth) {
        var headers = {
            "Authorization": 'Bearer ' + auth
        }
    } else headers = " ";
    return fetchSelf = {
        url: url,
        headers: headers,
        contentType: 'application/json',
        secureProtocol: 'TLSv1_2_method',
        type: type,
        data: query
    };
}
async function processEscalation(message) {
    var tags = await getValueFromAPI('currentUser.tags');
    var url = RmApp.settings.serverUrl + "/api/v2/tickets/" + await getValueFromAPI(
        'ticket.id') + "/side_conversations.json";
    var fetchSelf = makeFetchBody(url, 'GET', '', RmApp.settings.tokenZen);
    var response = await client.request(fetchSelf);
    response.side_conversations.forEach(async function (conf) {
        if (tags.includes("product_level_3") && (conf.subject.indexOf(
                    "Level 3") > -
                1)) {
            await replyToConf(conf.id, conf.participants, message);

        } else if (tags.includes("product_level_2") && (conf.subject.indexOf(
                    "Level 2") > -
                1)) {
            await replyToConf(conf.id, conf.participants, message);

        } else if (tags.includes("product_level_1") && (conf.subject.indexOf(
                    "Level 1") > -
                1)) {
            await replyToConf(conf.id, conf.participants, message);
        }
    });
}

async function replyToConf(id, participants, message) {
    var url = RmApp.settings.serverUrl + "/api/v2/tickets/" + await getValueFromAPI('ticket.id') +
        "/side_conversations/" + id + "/reply.json";
    var message = {
        message: {
            subject: "ETA revised",
            html_body: message,
            to: participants
        }
    }
    var query = JSON.stringify(message);
    var fetch = makeFetchBody(url, "POST", query, RmApp.settings.tokenZen);
    client.request(fetch);
}

function capitalize(str) {
    if (!str) return str;
    return str[0].toUpperCase() + str.slice(1);
}


function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}