/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Solace Systems Node.js API
 * Persistence with Queues tutorial - Queue Producer
 * Demonstrates sending persistent messages to a queue
 */

/*jslint es6 node:true devel:true*/

var QueueProducer = function (solaceModule, queueName) {
    'use strict';
    var solace = solaceModule;
    var producer = {};
    producer.session = null;
    producer.queueName = queueName;

    // Logger
    producer.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    producer.log('\n*** Producer to queue "' + producer.queueName + '" is ready to connect ***');

    // main function
    producer.run = function (argv) {
        if (argv.length >= (2 + 4)) { // expecting 4 real arguments
            producer.connect(argv.slice(2)[0], argv.slice(3)[0], argv.slice(4)[0], argv.slice(5)[0]);
        } else {
            producer.log('Cannot connect: expecting all arguments' +
                ' <host:port> <client-username> <client-password> <message-vpn>.');
        }
    };

    // Establishes connection to Solace message router by its hostname
    producer.connect = function (host, username, password, vpn) {
        if (producer.session !== null) {
            producer.log('Already connected and ready to send messages.');
        } else {
            producer.connectToSolace(host, username, password, vpn);
        }
    };

    producer.connectToSolace = function (host, username, password, vpn) {
        const sessionProperties = new solace.SessionProperties();
        sessionProperties.url = 'ws://' + host;
        producer.log('Connecting to Solace message router using WebSocket transport url ws://' + host);
        sessionProperties.vpnName = vpn;
        producer.log('Solace message router VPN name: ' + sessionProperties.vpnName);
        sessionProperties.userName = username;
        producer.log('Client username: ' + sessionProperties.userName);
        sessionProperties.password = password;
        // sessionProperties.publisherProperties = new solace.PublisherFlowProperties({enabled: false});
        // create session
        producer.session = solace.SolclientFactory.createSession(sessionProperties);
        // define session event listeners
        producer.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            producer.log('=== Successfully connected and ready to send messages. ===');
            producer.sendMessage();
            producer.exit();
        });
        producer.session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
            producer.log('Disconnected.');
            if (producer.session !== null) {
                producer.session.dispose();
                producer.session = null;
            }
        });
        // connect the session
        try {
            producer.session.connect();
        } catch (error) {
            producer.log(error.toString());
        }
    };

    // Sends one message
    producer.sendMessage = function () {
        if (producer.session !== null) {
            var messageText = 'Sample Message';
            var message = solace.SolclientFactory.createMessage();
            producer.log('Sending message "' + messageText + '" to queue "' + producer.queueName + '"...');
            message.setDestination(new solace.Destination(producer.queueName, solace.DestinationType.QUEUE));
            message.setBinaryAttachment(messageText);
            message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
            try {
                producer.session.send(message);
                producer.log('Message sent.');
            } catch (error) {
                producer.log(error.toString());
            }
        } else {
            producer.log('Cannot send messages because not connected to Solace message router.');
        }
    };

    producer.exit = function () {
        producer.disconnect();
        setTimeout(function () {
            process.exit();
        }, 1000); // wait for 1 second to finish
    };

    // Gracefully disconnects from Solace message router
    producer.disconnect = function () {
        producer.log('Disconnecting from Solace message router...');
        if (producer.session !== null) {
            try {
                producer.session.disconnect();
            } catch (error) {
                producer.log(error.toString());
            }
        } else {
            producer.log('Not connected to Solace message router.');
        }
    };

    return producer;
};

var solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the producer, specifying the name of the destination queue
var producer = new QueueProducer(solace, 'tutorial/queue');

// send message to Solace message router
producer.run(process.argv);
