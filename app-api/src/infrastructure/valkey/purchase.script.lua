local stock_key = KEYS[1]
local users_key = KEYS[2]
local config_key = KEYS[3]
local user_id = ARGV[1]
local now = tonumber(ARGV[2])

local config_raw = redis.call('GET', config_key)
if not config_raw then
  return 'sale_not_active_ended'
end

local config = cjson.decode(config_raw)
local start_at = tonumber(config.startAt)
local end_at = tonumber(config.endAt)

if now < start_at then
  return 'sale_not_active_upcoming'
end

if now >= end_at then
  return 'sale_not_active_ended'
end

if redis.call('SISMEMBER', users_key, user_id) == 1 then
  return 'already_purchased'
end

local stock = tonumber(redis.call('GET', stock_key) or '0')
if stock <= 0 then
  return 'sold_out'
end

redis.call('DECR', stock_key)
redis.call('SADD', users_key, user_id)
return 'success'
