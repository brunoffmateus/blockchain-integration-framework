import sys
import os
# uncomment if problems with dependencies
#%pip install pm4py
#%pip install pandas
import pm4py
import time
import pandas
import pickle
import json
from datetime import datetime

def import_csv_original(log_file_path):
    event_log = pandas.read_csv(log_file_path, sep=';')
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def import_json_original(log_file_path):
    with open(log_file_path, 'r') as file:
        data = json.load(file)
    event_log = pandas.DataFrame(data)
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

##################################################################

# uses heuristics miner algorithm
def create_and_serialize_model_heuristics(ccLog, path_to_ccmodel_dir):
    pn, im, fm = pm4py.discover_petri_net_heuristics(ccLog)

    # write petri net in ccModel file:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ccmodel_file_name = os.path.join(path_to_ccmodel_dir, f"heuristics_ccmodel_{timestamp}.pnml")
    pm4py.write_pnml(pn, im, fm, ccmodel_file_name)

    # to view petri net:
    # pm4py.view_petri_net(pn, im, fm)
    
    # to save petri net image:
    # file_name = f"heuristics_miner_PN.png"
    # pm4py.save_vis_petri_net(pn, im, fm, file_name, format="png")
    
    # return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)
    return ccmodel_file_name

##################################################################

# uses inductive miner algorithm
def create_and_serialize_model_inductive(ccLog, path_to_ccmodel_dir):
    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog)
    
    # write petri net in ccModel file:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ccmodel_file_name = os.path.join(path_to_ccmodel_dir, f"inductive_ccmodel_{timestamp}.pnml")
    pm4py.write_pnml(pn, im, fm, ccmodel_file_name)
    
    # to view petri net:
    # pm4py.view_petri_net(pn, im, fm)
    
    # to save petri net image:
    # file_name = f"inductive_miner_PN.png"
    # pm4py.save_vis_petri_net(pn, im, fm, file_name, format="png")
    
    # return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)
    return ccmodel_file_name

##################################################################

def create_and_serialize_model(ccLog, mining_process, path_to_ccmodel_dir):
    if mining_process == "heuristics":
        return create_and_serialize_model_heuristics(ccLog, path_to_ccmodel_dir)
    elif mining_process == "inductive":
        return create_and_serialize_model_inductive(ccLog, path_to_ccmodel_dir)

##################################################################

def main():    
    # Check if the log file exists
    if not os.path.exists(log_file_path):
        print(f"Cross-chain Log file: '{log_file_path}' does not exist")
        exit(1)
    
    # Check if ccModel directory exists
    if not os.path.exists(path_to_ccmodel_dir):
        print(f"Cross-chain Model directory: '{path_to_ccmodel_dir}' does not exist")
        exit(1)
        
    file_extension = os.path.splitext(log_file_path)[1].lower()
    
    if file_extension == '.csv':
        ccLog = import_csv_original(log_file_path)
        serialized_model = create_and_serialize_model(ccLog, mining_process, path_to_ccmodel_dir)
        print(serialized_model)
    elif file_extension == '.json':
        ccLog = import_json_original(log_file_path)
        serialized_model = create_and_serialize_model(ccLog, mining_process, path_to_ccmodel_dir)
        print(serialized_model)
    else:
        print(f"Unsupported file type: {file_extension}")
        exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 create_model.py path_to_log_file path_to_ccmodel_dir mining_process")
        exit(1)
    
    log_file_path = sys.argv[1]
    path_to_ccmodel_dir = sys.argv[2]
    mining_process = sys.argv[3]
    main()