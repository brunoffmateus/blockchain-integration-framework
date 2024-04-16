import sys
import os
# uncomment if problems with dependencies
#%pip install pm4py
#%pip install pandas
import pm4py
import datetime as dt
import time
import pandas

#chage path if necessary
path = os.getcwd()
parent = os.path.dirname(path)
csv_dir = parent + "/../csv/"
json_dir = parent + "/../json/"

def import_csv_original(file_path):
    event_log = pandas.read_csv(file_path, sep=';')
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def import_json_original(file_path):
    event_log = pandas.read_json(file_path)
    event_log['timestamp'] = pandas.to_datetime(event_log['timestamp'])
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def getStartActivities(event_log):
    s = pm4py.get_start_activities(event_log)
    print("Start activities: {}\n".format(s))
    return s

def getEndActivities(event_log):
    e = pm4py.get_end_activities(event_log)
    print("End activities: {}\n".format(e))
    return e

def getAttributeFromLog(event_log, attr):
    entries = pm4py.get_event_attribute_values(event_log, attr)
    print("Entries: {}\n".format(entries))
    return entries

def main():
    startTime = time.perf_counter()

    if file.endswith(".csv"):
        file_path = csv_dir + file
        if (not os.path.exists(file_path)):
            print(f"File '{file_path}' does not exist")
            exit()
        ccLog = import_csv_original(file_path)
    elif (file.endswith(".json")):
        file_path = json_dir + file
        if (not os.path.exists(file_path)):
            print(f"File '{file_path}' does not exist")
            exit()
        ccLog = import_json_original(file_path)
    else:
        print("File provided is not .csv or .json")
        exit()
    
    print(file_path)
    print(ccLog)
    startAct = getStartActivities(ccLog)
    endAct = getEndActivities(ccLog)
    timestamps = getAttributeFromLog(ccLog, "timestamp")

    # process model from ccLog
    process_tree = pm4py.discover_process_tree_inductive(ccLog)
    print(process_tree)
    # ->( 'InitializeAsset', 'LockAsset', 'CreateAsset', *( 'TransferAsset', tau ), 'DeleteAsset' )

    # # creates the Petri model from ccLog
    # net, initial_marking, final_marking = pm4py.discover_petri_net_inductive(ccLog)
    # log_other_model = import_csv_original(file_path)

    # # checks if the Petri model conforms to the rules of log_other_model
    # aligned_traces = pm4py.conformance_diagnostics_alignments(log_other_model, net, initial_marking, final_marking)
    # print("\naligned_traces:\n", aligned_traces)

    endTime = time.perf_counter()
    timeTakenMs = endTime - startTime
    print(f"\nExecution Time (ms): {timeTakenMs*1000:0.3f}" )

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 print_all_cclogs.py file_to_create_model")
        exit()
    
    file = sys.argv[1]
    # file2 = sys.argv[2]
    main()