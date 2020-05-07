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

async function showWarnings() {
    var tags = await getValueFromAPI('ticket.tags');
    var priority = await getValueFromAPI('ticket.priority');
    var rows = 0;
    tags.forEach(tag => {
        if (tag.indexOf('smua') > -1) {
            addWarning("smua", 1, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
            rows++;
        }
        if (tag.indexOf("vip_client") > -1) {
            addWarning("vip", 1, 'VIP');
        };
        if (tag.includes('severity1_critical') || tag.includes('severity2_major') || tag.includes('severity3_normal') || tag.includes('severity4_low')) {
            addWarning("severity", 2, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
            rows++;
        }
        // if (tag.indexOf("premium_solution_support") > -1) {
        //     addWarning("ps", 1);
        //     isAdded = true;
        // };

        if (tag.includes('priority_raised')) {
            document.querySelector('i[data-raised]').classList.remove('hidden')
        }

        if (tag.includes('escalation_open') || tag.includes('escalation_closed')) {
            addWarning("escalation", 3, capitalize(tag.substring(tag.indexOf('_') + 1, tag.length)));
            rows++;
        }
    });
    if (priority && priority != '-') {
        addWarning("priority", 2, capitalize(priority));
    }

    return rows;
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
    addTag("waiting_for_fix");
}

function openAboutPage() {
    window.open('https://wiki.abbyy.com/display/SP/Integration+with+Reclamation+Manager');
}

async function launchModal(url, size = {}) {
    await client.invoke('instances.create', {
        location: 'modal',
        url: url,
        size: size,
    });
}

async function addTag(value) {
    var sourceQuery = {
        tags: [value]
    }
    var updateQuery = JSON.stringify(sourceQuery);
    var updateUrl = RmApp.settings.serverUrl + 'api/v2/tickets/' +
        await getValueFromAPI('ticket.id') + '/tags.json';
    var updateFetch = makeFetchBody(updateUrl, 'PUT', updateQuery, RmApp
        .settings.tokenZen);
    await client.request(updateFetch);
    // client.invoke('ticket.tags.add', value);
}
// удалить тег
async function removeTag(value) {
    var sourceQuery = {
        tags: [value]
    }
    var updateQuery = JSON.stringify(sourceQuery);
    var updateUrl = RmApp.settings.serverUrl + 'api/v2/tickets/' +
        await getValueFromAPI('ticket.id') + '/tags.json';
    var updateFetch = makeFetchBody(updateUrl, 'DELETE', updateQuery, RmApp
        .settings.tokenZen);
    await client.request(updateFetch);
    // client.invoke('ticket.tags.remove', value);
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
        if (auth.includes("Basic")) headers = {
            "Authorization": auth
        };
    } else headers = " ";
    return {
        url: url,
        headers: headers,
        contentType: 'application/json',
        secureProtocol: 'TLSv1_2_method',
        type: type,
        data: query,
        cors: true

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
            from: await getValueFromAPI('currentUser.email'),
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

function getLinksFromCommentText(str) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(str, "text/html");
    return Array.from(doc.links);
}

async function updateField(fieldId, value) {
    var sourceQuery = {
        ticket: {
            custom_fields: [{
                id: fieldId,
                value: value
            }]
        }
    }
    var updateQuery = JSON.stringify(sourceQuery);
    var updateUrl = RmApp.settings.serverUrl + 'api/v2/tickets/' +
        await getValueFromAPI('ticket.id'); + '.json';
    var updateFetch = makeFetchBody(updateUrl, 'PUT', updateQuery, RmApp
        .settings.tokenZen);
    await client.request(updateFetch);
}

async function updateTicket(id) {

}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}