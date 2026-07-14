#!/bin/bash
echo "Testing /users:"
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.0.33/users
echo "Testing /orders:"
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.0.33/orders
