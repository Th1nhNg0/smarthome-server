import RPi.GPIO as GPIO
from time import sleep
import os
import glob
import socketio
import datetime

RELAY_OUTPUT = [4, 5, 6, 12, 17, 18, 25, 27]

GPIO.setmode(GPIO.BCM)
for relay in RELAY_OUTPUT:
    GPIO.setup(relay, GPIO.OUT)

sio = socketio.Client()
#os.system('modprobe w1-gpio')
#os.system('modprobe w1-therm')

base_dir = '/sys/bus/w1/devices/'
device_folders = glob.glob(base_dir+'28*')
device_files = [x+'/w1_slave' for x in device_folders]


def read_temp_raw(device_file):
    f = open(device_file)
    lines = f.readlines()
    f.close()
    return lines


def read_temp(device_file):
    print(device_file)
    lines = read_temp_raw(device_file)
    while lines[0].strip()[-3:] != 'YES':
        sleep(0.2)
        lines = read_temp_raw(device_file)
    kqn = lines[1].find('t=')
    if kqn != -1:
        return lines[1][kqn+2:-1]


@sio.event
def connect():
    print("Da ket noi toi server")


@sio.event
def connect_error():
    print("khong the ket noi server")


@sio.event
def disconnect():
    print("da ngat ket noi server")


@sio.event
def GPIO_control(data):
    cong = int(data['GPIO'])
    state = int(data['state'])
    print('cong', cong, 'state', state)
    GPIO.output(cong, state)

# chay ham nay de xem chan nao dang bat/tat


def get_GPIO_info():
    data = {}
    for relay in RELAY_OUTPUT:
        data[relay] = GPIO.input(relay)
    return data


sio.connect('http://192.168.43.60:3000?name=board')

try:
    while True:
        # sleep(.2)
        nhietdo = [read_temp(x) for x in device_files]
        thoigian = str(datetime.datetime.now())

        send_data = [
            {'date': thoigian, 'value': float(v)/1000} for v in nhietdo]
        sio.emit('temp_sensor', send_data)

        GPIO_info = get_GPIO_info()
        sio.emit('board_data', {'GPIO': GPIO_info})

except KeyboardInterrupt:
    sio.disconnect()
    GPIO.cleanup()
